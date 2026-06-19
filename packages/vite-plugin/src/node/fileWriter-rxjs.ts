import * as lexer from 'es-module-lexer'
import fsx from 'fs-extra'
import { readFile } from 'fs/promises'
import MagicString from 'magic-string'
import {
  BehaviorSubject,
  debounceTime,
  filter,
  first,
  firstValueFrom,
  map,
  mergeMap,
  Observable,
  of,
  ReplaySubject,
  retry,
  share,
  startWith,
  switchMap,
  takeUntil,
  tap,
  toArray,
} from 'rxjs'
import { build as viteBuild, ErrorPayload, ViteDevServer } from 'vite'
import { OutputFile, outputFiles } from './fileWriter-filesMap'
import { getFileName, getOutputPath, getViteUrl } from './fileWriter-utilities'
import { join } from './path'
import {
  CrxDevAssetId,
  CrxDevScriptId,
  CrxOutputAsset,
  CrxOutputChunk,
  CrxPlugin,
} from './types'
import convertSourceMap from 'convert-source-map'

const { outputFile } = fsx

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

const isOutputChunk = (
  item: CrxOutputChunk | CrxOutputAsset,
): item is CrxOutputChunk =>
  item.type === 'chunk'

const isOutputAsset = (
  item: CrxOutputChunk | CrxOutputAsset,
): item is CrxOutputAsset =>
  item.type === 'asset'

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

const allFilesReadyDebounceMs = 100
let currentAllFilesReadyGeneration = 0
let completedAllFilesReadyGeneration = 0
let lastAllFilesReadyResults: PromiseSettledResult<void>[] | undefined

/** Emit when all script files are written */
const allFilesReadyState$ = buildEnd$.pipe(
  switchMap(() =>
    outputFiles.change$.pipe(
      startWith({ type: 'start' }),
      tap(() => {
        currentAllFilesReadyGeneration += 1
      }),
      debounceTime(allFilesReadyDebounceMs),
    ),
  ),
  map(() => ({
    generation: currentAllFilesReadyGeneration,
    files: [...outputFiles.values()],
  })),
  switchMap(async ({ generation, files }) => {
    const seen = new Set<OutputFile>()
    const results = await Promise.allSettled(
      files.map((file) => waitForOutputFile(file, seen)),
    )
    return { generation, results }
  }),
  tap(({ generation, results }) => {
    completedAllFilesReadyGeneration = generation
    lastAllFilesReadyResults = results
  }),
  share(),
)

export const allFilesReady$ = allFilesReadyState$.pipe(
  map(({ results }) => results),
)

async function waitForOutputFile(
  file: OutputFile,
  seen = new Set<OutputFile>(),
): Promise<void> {
  if (seen.has(file)) return
  seen.add(file)
  const { deps } = await file.file
  await Promise.all(deps.map((dep) => waitForOutputFile(dep, seen)))
}

async function waitForAllFilesReadyResults(): Promise<
  PromiseSettledResult<void>[]
> {
  const targetGeneration = currentAllFilesReadyGeneration
  if (
    lastAllFilesReadyResults &&
    completedAllFilesReadyGeneration >= targetGeneration
  ) {
    return lastAllFilesReadyResults
  }

  const { results } = await firstValueFrom(
    allFilesReadyState$.pipe(
      filter(({ generation }) => generation >= targetGeneration),
    ),
  )
  return results
}

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
        const originalViteUrl = getViteUrl(script)
        const isVueSfcQuery = script.id.includes('?vue')
        const viteUrl = getViteUrl(script, { timestamp: isVueSfcQuery })
        if (isVueSfcQuery) {
          const module = await server.moduleGraph.getModuleByUrl(originalViteUrl)
          if (module) server.moduleGraph.invalidateModule(module)
        }
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
        const isSelfDependency = (id: string) =>
          getFileName({ type: 'module', id }) === fileName
        // @vitejs/plugin-react >=5.0.4 can create React Refresh self-imports.
        // Keep the import rewrite, but do not wait on this file as its own dependency.
        const depSet = new Set<string>(deps.filter((id) => !isSelfDependency(id)))
        const magic = new MagicString(code)
        for (const i of imports)
          if (i.n) {
            const depFileName = getFileName({ type: 'module', id: i.n })
            if (!isSelfDependency(i.n)) depSet.add(i.n)

            // NOTE: Temporary fix for this bug: https://github.com/guybedford/es-module-lexer/issues/144
            const fullImport = code.substring(i.s, i.e)
            magic.overwrite(i.s, i.e, fullImport.replace(i.n, `/${depFileName}`))

            // NOTE: use this once the bug is fixed
            // magic.overwrite(i.s, i.e, `/${fileName}`)
          }
        return { target, source: magic.toString(), deps: [...depSet] }
      }),
    )
}

async function bundleIife(
  server: ViteDevServer,
  script: CrxDevScriptId,
  fileName: string,
) {
  const input = resolveScriptInput(server, script.id)
  const sourcemap =
    server.config.build.sourcemap === 'inline' ? 'inline' : false

  // Use Vite's build API instead of raw Rollup to avoid plugin compatibility issues
  // (Vite 6+ plugins are tracked in WeakMaps and can't be reused in separate Rollup builds)
  // We use configFile: false to avoid loading user's config which may have incompatible settings
  const result = await viteBuild({
    root: server.config.root,
    mode: server.config.mode,
    configFile: false, // Don't load user's config - use minimal IIFE-specific settings
    logLevel: 'silent',
    resolve: {
      // Copy resolve settings from the dev server for consistency
      alias: server.config.resolve.alias,
      extensions: server.config.resolve.extensions,
      conditions: server.config.resolve.conditions,
    },
    build: {
      write: false, // Don't write to disk, we'll handle that
      manifest: false, // Don't generate Vite manifest
      rollupOptions: {
        input,
        output: {
          format: 'iife',
          name: getIifeGlobalName(fileName),
          entryFileNames: fileName,
          inlineDynamicImports: true, // Required for IIFE format
          sourcemap,
        },
      },
      minify: false,
      copyPublicDir: false,
    },
  })

  // viteBuild with write: false returns bundler output objects. Cast to the
  // local output shape so this package doesn't expose Rollup types.
  const outputs = Array.isArray(result) ? result : [result]
  const firstOutput = outputs[0]
  const output = (
    'output' in firstOutput ? firstOutput.output : undefined
  ) as (CrxOutputChunk | CrxOutputAsset)[] | undefined

  if (!output) {
    throw new Error(`Unable to generate IIFE bundle for "${script.id}"`)
  }

  const entryChunk = output.find(
    (item): item is CrxOutputChunk => isOutputChunk(item) && item.isEntry,
  )
  if (!entryChunk) {
    throw new Error(`Unable to generate IIFE bundle for "${script.id}"`)
  }

  const assets = output.filter(isOutputAsset).filter(
    // Filter out manifest.json to avoid overwriting extension manifest
    (asset) =>
      asset.fileName !== 'manifest.json' &&
      !asset.fileName.startsWith('.vite/'),
  )
  const extraChunks = output.filter(
    (item): item is CrxOutputChunk => isOutputChunk(item) && !item.isEntry,
  )

  return {
    code: entryChunk.code,
    assets,
    extraChunks,
  }
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
  await waitForAllFilesReadyResults()
}

/** Resolves when all existing files in scriptFiles are written. */
export async function allFilesSuccess(): Promise<void> {
  const result = await waitForAllFilesReadyResults()
  const reason = result.find(isRejected)?.reason
  if (typeof reason === 'undefined') return
  if (reason instanceof Error) throw reason
  throw new Error(reason.toString())
}
