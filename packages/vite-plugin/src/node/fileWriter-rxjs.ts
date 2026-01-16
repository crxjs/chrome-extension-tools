import * as lexer from 'es-module-lexer'
import fsx from 'fs-extra'
import { readFile } from 'fs/promises'
import MagicString from 'magic-string'
import {
  OutputAsset,
  OutputChunk,
  OutputOptions,
  rollup,
  RollupOptions,
} from 'rollup'
import {
  BehaviorSubject,
  filter,
  first,
  firstValueFrom,
  map,
  mergeMap,
  Observable,
  of,
  ReplaySubject,
  retry,
  startWith,
  switchMap,
  takeUntil,
  toArray,
} from 'rxjs'
import {
  ErrorPayload,
  resolveConfig,
  ResolvedConfig,
  ViteDevServer,
} from 'vite'
import { outputFiles } from './fileWriter-filesMap'
import { getFileName, getOutputPath, getViteUrl } from './fileWriter-utilities'
import { join } from './path'
import { CrxDevAssetId, CrxDevScriptId, CrxPlugin } from './types'
import convertSourceMap from 'convert-source-map'

const { outputFile } = fsx

const buildConfigCache = new Map<string, ResolvedConfig>()

const getBuildConfigCacheKey = (server: ViteDevServer) => {
  return `${server.config.root}:${server.config.mode}:${
    server.config.configFile ?? 'inline'
  }`
}

async function resolveBuildConfig(
  server: ViteDevServer,
): Promise<ResolvedConfig> {
  const cacheKey = getBuildConfigCacheKey(server)
  const cached = buildConfigCache.get(cacheKey)
  if (cached) return cached
  const configFile = server.config.configFile ?? false
  const resolved = await resolveConfig(
    {
      root: server.config.root,
      mode: server.config.mode,
      logLevel: 'silent',
      configFile,
    },
    'build',
    server.config.mode,
  )
  buildConfigCache.set(cacheKey, resolved)
  return resolved
}

const getIifeGlobalName = (fileName: string) => {
  const base = fileName.split('/').pop() ?? fileName
  const sanitized = base.replace(/\W+/g, '_').replace(/^_+/, '')
  return `crx_${sanitized || 'content_script'}`
}

const resolveScriptInput = (server: ViteDevServer, id: string) => {
  if (id.startsWith('/@fs/')) return id.slice('/@fs/'.length)
  if (id.startsWith('/')) return join(server.config.root, id.slice(1))
  return id
}

const isOutputChunk = (item: OutputChunk | OutputAsset): item is OutputChunk =>
  item.type === 'chunk'

const isOutputAsset = (item: OutputChunk | OutputAsset): item is OutputAsset =>
  item.type === 'asset'

async function bundleIife(
  server: ViteDevServer,
  script: CrxDevScriptId,
  fileName: string,
) {
  const buildConfig = await resolveBuildConfig(server)
  const input = resolveScriptInput(server, script.id)
  const rollupOptions: RollupOptions = {
    input,
    plugins: buildConfig.plugins.filter(
      (plugin) => !plugin.name?.startsWith('crx:'),
    ),
    external: buildConfig.build.rollupOptions?.external,
    onwarn: buildConfig.build.rollupOptions?.onwarn,
    treeshake: buildConfig.build.rollupOptions?.treeshake,
  }
  const rollupOutput = [buildConfig.build.rollupOptions?.output].flat()[0]
  const { dir, file, manualChunks, ...baseOutputOptions } = (rollupOutput ??
    {}) as OutputOptions
  const sourcemap = buildConfig.build.sourcemap === 'inline' ? 'inline' : false
  const outputOptions: OutputOptions = {
    ...baseOutputOptions,
    format: 'iife',
    inlineDynamicImports: true,
    entryFileNames: fileName,
    assetFileNames:
      baseOutputOptions.assetFileNames ?? 'assets/[name][extname]',
    name: getIifeGlobalName(fileName),
    sourcemap,
  }

  const bundle = await rollup(rollupOptions)
  const { output } = await bundle.generate(outputOptions)
  await bundle.close()

  const entryChunk = output.find(
    (item): item is OutputChunk => isOutputChunk(item) && item.isEntry,
  )
  if (!entryChunk) {
    throw new Error(`Unable to generate IIFE bundle for "${script.id}"`)
  }

  const assets = output.filter(isOutputAsset)
  const extraChunks = output.filter(
    (item): item is OutputChunk => isOutputChunk(item) && !item.isEntry,
  )

  return {
    code: entryChunk.code,
    assets,
    extraChunks,
  }
}

/* ----------------- SERVER EVENTS ----------------- */

export interface ServerEventStart {
  type: 'start'
  server: ViteDevServer
}
export interface ServerEventClose {
  type: 'close'
}

/** Using a replay subject so we can get the last of either event */
export const serverEvent$ = new ReplaySubject<
  ServerEventStart | ServerEventClose
>(1)
export const close$ = serverEvent$.pipe(
  filter((e): e is ServerEventClose => e.type === 'close'),
  switchMap((e) => of(e)),
)
export const start$ = serverEvent$.pipe(
  filter((e): e is ServerEventStart => e.type === 'start'),
  switchMap((e) => of(e)),
)

/* ------------------ BUILD EVENTS ----------------- */

export interface FileWriterEventBuildStart {
  type: 'build_start'
}
export interface FileWriterEventBuildEnd {
  type: 'build_end'
}

/** Using a replay subject so we can get the last of either event */
export const fileWriterEvent$ = new ReplaySubject<
  FileWriterEventBuildStart | FileWriterEventBuildEnd
>(1)
export const buildEnd$ = fileWriterEvent$.pipe(
  filter((e): e is FileWriterEventBuildEnd => e.type === 'build_end'),
  switchMap((e) => of(e)),
)
export const buildStart$ = fileWriterEvent$.pipe(
  filter((e): e is FileWriterEventBuildStart => e.type === 'build_start'),
  switchMap((e) => of(e)),
)

/** Emit when all script files are written */
export const allFilesReady$ = buildEnd$.pipe(
  switchMap(() => outputFiles.change$.pipe(startWith({ type: 'start' }))),
  map(() => [...outputFiles.values()]),
  switchMap((files) => Promise.allSettled(files.map(({ file }) => file))),
)

const timestamp$ = new BehaviorSubject(Date.now())
allFilesReady$.subscribe(() => {
  // update timestamp when all files have emitted
  timestamp$.next(Date.now())
})

export const isRejected = <T>(
  x: PromiseSettledResult<T> | undefined,
): x is PromiseRejectedResult => x?.status === 'rejected'
export const fileWriterError$: Observable<ErrorPayload> = allFilesReady$.pipe(
  mergeMap((results) => results.filter(isRejected)),
  map((rejected): ErrorPayload => ({ err: rejected.reason, type: 'error' })),
)
export const allFileWriterErrors = firstValueFrom(
  fileWriterError$.pipe(
    takeUntil(serverEvent$.pipe(first(({ type }) => type === 'close'))),
    toArray(),
  ),
)

/* ------------------- WRITE OPS ------------------- */

interface OperatorFileData {
  ($: Observable<ServerEventStart>): Observable<{
    target: string
    source: string | Uint8Array
    deps: string[]
  }>
}

export function prepFileData(
  fileId: CrxDevAssetId | CrxDevScriptId,
): OperatorFileData {
  const fileName = getFileName(fileId)
  if (fileId.type === 'asset') {
    return prepAsset(fileName, fileId)
  } else {
    return prepScript(fileName, fileId)
  }
}

function prepAsset(
  fileName: string,
  { id, source }: CrxDevAssetId,
): OperatorFileData {
  return ($) =>
    $.pipe(
      mergeMap(async ({ server }) => {
        const target = getOutputPath(server, fileName)
        return {
          target,
          source: source ?? (await readFile(join(server.config.root, id))),
          deps: [],
        }
      }),
    )
}

function prepScript(
  fileName: string,
  script: CrxDevScriptId,
): OperatorFileData {
  if (script.type === 'iife') return prepIifeScript(fileName, script)
  return ($) =>
    $.pipe(
      // get script contents from dev server
      mergeMap(async ({ server }) => {
        const target = getOutputPath(server, fileName)
        const viteUrl = getViteUrl(script)
        const transformResult = await server.transformRequest(viteUrl)
        if (!transformResult)
          throw new TypeError(`Unable to load "${script.id}" from server.`)
        const { deps = [], dynamicDeps = [], map } = transformResult
        let { code } = transformResult
        try {
          if (map && server.config.build.sourcemap === 'inline') {
            // remove existing source map (might be a url, which doesn't work in content scripts)
            code = code.replace(/\n*\/\/# sourceMappingURL=[^\n]+/g, '')
            // create a new inline source map
            const sourceMap = convertSourceMap.fromObject(map).toComment()
            code += `\n${sourceMap}\n`
          }
        } catch (error) {
          console.warn('Failed to inline source map', error)
        }
        return {
          target,
          code,
          deps: [...deps, ...dynamicDeps].flat(),
          server,
        }
      }),
      // retry in case of dependency rebundle
      retry({ count: 10, delay: 100 }),
      // patch content scripts
      mergeMap(async ({ target, server, ...rest }) => {
        const plugins = server.config.plugins as CrxPlugin[]
        let { code, deps } = rest
        for (const plugin of plugins) {
          const r = await plugin.renderCrxDevScript?.(code, script)
          if (typeof r === 'string') code = r
        }
        return { target, code, deps }
      }),
      mergeMap(async ({ target, code, deps }) => {
        await lexer.init
        const [imports] = lexer.parse(code, fileName)
        const depSet = new Set<string>(deps)
        const magic = new MagicString(code)
        for (const i of imports)
          if (i.n) {
            depSet.add(i.n)
            const fileName = getFileName({ type: 'module', id: i.n })

            // NOTE: Temporary fix for this bug: https://github.com/guybedford/es-module-lexer/issues/144
            const fullImport = code.substring(i.s, i.e)
            magic.overwrite(i.s, i.e, fullImport.replace(i.n, `/${fileName}`))

            // NOTE: use this once the bug is fixed
            // magic.overwrite(i.s, i.e, `/${fileName}`)
          }
        return { target, source: magic.toString(), deps: [...depSet] }
      }),
    )
}

function prepIifeScript(
  fileName: string,
  script: CrxDevScriptId,
): OperatorFileData {
  return ($) =>
    $.pipe(
      mergeMap(async ({ server }) => {
        const target = getOutputPath(server, fileName)
        const { code, assets, extraChunks } = await bundleIife(
          server,
          script,
          fileName,
        )
        return { target, source: code, deps: [], server, assets, extraChunks }
      }),
      mergeMap(
        async ({ target, source, deps, server, assets, extraChunks }) => {
          const extras = [
            ...assets.map((asset) => ({
              fileName: asset.fileName,
              source: asset.source,
            })),
            ...extraChunks.map((chunk) => ({
              fileName: chunk.fileName,
              source: chunk.code,
            })),
          ].filter((item) => item.fileName !== fileName)

          await Promise.all(
            extras.map(async (item) => {
              const outputPath = getOutputPath(server, item.fileName)
              if (typeof item.source === 'undefined' || item.source === null)
                return
              if (item.source instanceof Uint8Array)
                await outputFile(outputPath, item.source)
              else
                await outputFile(outputPath, item.source, { encoding: 'utf8' })
            }),
          )

          return { target, source, deps }
        },
      ),
    )
}

/** Resolves when all existing files in scriptFiles are written. */
export async function allFilesReady(): Promise<void> {
  await firstValueFrom(allFilesReady$)
}

/** Resolves when all existing files in scriptFiles are written. */
export async function allFilesSuccess(): Promise<void> {
  const result = await firstValueFrom(allFilesReady$)
  const reason = result.find(isRejected)?.reason
  if (typeof reason === 'undefined') return
  if (reason instanceof Error) throw reason
  throw new Error(reason.toString())
}
