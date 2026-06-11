import * as lexer from 'es-module-lexer'
import fsx from 'fs-extra'
import { readFile } from 'fs/promises'
import { performance } from 'perf_hooks'
import MagicString from 'magic-string'
import { OutputAsset, OutputChunk } from 'rollup'
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
import { _debug } from './helpers'
import { join } from './path'
import { CrxDevAssetId, CrxDevScriptId, CrxPlugin } from './types'
import convertSourceMap from 'convert-source-map'

const { outputFile } = fsx
const perfDebug = _debug('file-writer').extend('perf')
const progressDebug = _debug('file-writer').extend('progress')

function readIntegerEnv(name: string, fallback: number) {
  const value = process.env[name]
  if (!value) return fallback
  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) ? parsed : fallback
}

const perfThresholdMs = Math.max(
  0,
  readIntegerEnv('CRX_FILE_WRITER_PERF_THRESHOLD_MS', 250),
)
const readyDebounceMs = Math.max(
  0,
  readIntegerEnv('CRX_FILE_WRITER_READY_DEBOUNCE_MS', 100),
)
const progressIntervalMs = Math.max(
  250,
  readIntegerEnv('CRX_FILE_WRITER_PROGRESS_INTERVAL_MS', 1000),
)

function shouldLogPerf(ms: number) {
  return perfThresholdMs === 0 || ms >= perfThresholdMs
}

function formatDurationSeconds(seconds: number) {
  if (!Number.isFinite(seconds)) return 'unknown'
  if (seconds < 10) return `${seconds.toFixed(1)}s`
  return `${Math.round(seconds)}s`
}

interface ReadyProgressStats {
  generation: number
  startTime: number
  initialFiles: number
  totalFiles: number
  seenFiles: number
  completedFiles: number
  activeFiles: number
  rejectedFiles: number
}

function updateReadyTotal(stats: ReadyProgressStats, seen: Set<OutputFile>) {
  stats.seenFiles = seen.size
  stats.totalFiles = Math.max(stats.totalFiles, outputFiles.size, seen.size)
}

function logReadyProgress(stats: ReadyProgressStats, phase: string) {
  const elapsedSeconds = Math.max(
    (performance.now() - stats.startTime) / 1000,
    0.001,
  )
  const totalFiles = Math.max(
    stats.totalFiles,
    stats.initialFiles,
    outputFiles.size,
  )
  const percent =
    totalFiles > 0
      ? Math.min(100, (stats.completedFiles / totalFiles) * 100)
      : 0
  const filesPerSecond = stats.completedFiles / elapsedSeconds
  const remainingFiles = Math.max(totalFiles - stats.completedFiles, 0)
  const etaSeconds =
    filesPerSecond > 0 && remainingFiles > 0
      ? remainingFiles / filesPerSecond
      : 0

  progressDebug(
    'ready phase=%s generation=%d files=%d/%d discovered pct=%s seen=%d active=%d rejected=%d rate=%s/s eta=%s elapsed=%s',
    phase,
    stats.generation,
    stats.completedFiles,
    totalFiles,
    `${percent.toFixed(1)}%`,
    stats.seenFiles,
    stats.activeFiles,
    stats.rejectedFiles,
    filesPerSecond.toFixed(1),
    formatDurationSeconds(etaSeconds),
    formatDurationSeconds(elapsedSeconds),
  )
}

function startReadyProgressTimer(stats: ReadyProgressStats) {
  if (!progressDebug.enabled) return
  let logged = false
  let stopped = false
  const timer = setInterval(() => {
    if (stats.generation !== currentAllFilesReadyGeneration) {
      stopped = true
      clearInterval(timer)
      return
    }
    logged = true
    logReadyProgress(stats, 'waiting')
  }, progressIntervalMs)
  timer.unref?.()
  return (phase: string) => {
    if (stopped) return
    stopped = true
    clearInterval(timer)
    if (stats.generation === currentAllFilesReadyGeneration && logged)
      logReadyProgress(stats, phase)
  }
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

let currentAllFilesReadyGeneration = 0
let completedAllFilesReadyGeneration = 0
let lastAllFilesReadyResults: PromiseSettledResult<void>[] | undefined

/** Emit when all script files are written */
const allFilesReadyState$ = buildEnd$.pipe(
  switchMap(() =>
    outputFiles.change$.pipe(
      startWith({ type: 'start' }),
      debounceTime(readyDebounceMs),
    ),
  ),
  map(() => ({
    generation: ++currentAllFilesReadyGeneration,
    files: [...outputFiles.values()],
  })),
  switchMap(async ({ generation, files }) => {
    const start = performance.now()
    const seen = new Set<OutputFile>()
    const stats = progressDebug.enabled
      ? {
          generation,
          startTime: start,
          initialFiles: files.length,
          totalFiles: files.length,
          seenFiles: 0,
          completedFiles: 0,
          activeFiles: 0,
          rejectedFiles: 0,
        }
      : undefined
    const stopProgress = stats && startReadyProgressTimer(stats)
    const results = await Promise.allSettled(
      files.map((file) => waitForOutputFile(file, seen, stats)),
    )
    if (stats) stats.rejectedFiles = results.filter(isRejected).length
    const totalMs = performance.now() - start
    if (shouldLogPerf(totalMs)) {
      perfDebug(
        'ready generation: generation=%d files=%d ms=%d rejected=%d',
        generation,
        files.length,
        Math.round(totalMs),
        results.filter(isRejected).length,
      )
    }
    stopProgress?.('ready')
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
  stats?: ReadyProgressStats,
): Promise<void> {
  if (seen.has(file)) return
  seen.add(file)
  if (stats) {
    stats.activeFiles += 1
    updateReadyTotal(stats, seen)
  }
  try {
    const { deps } = await file.file
    if (stats) updateReadyTotal(stats, seen)
    await Promise.all(deps.map((dep) => waitForOutputFile(dep, seen, stats)))
  } finally {
    if (stats) {
      stats.activeFiles -= 1
      stats.completedFiles += 1
      updateReadyTotal(stats, seen)
    }
  }
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
        const transformStart = performance.now()
        let transformResult: Awaited<
          ReturnType<typeof server.transformRequest>
        >
        try {
          transformResult = await server.transformRequest(viteUrl)
        } catch (error) {
          perfDebug(
            'transform failed: id=%s url=%s ms=%d',
            script.id,
            viteUrl,
            Math.round(performance.now() - transformStart),
          )
          throw error
        }
        if (!transformResult)
          throw new TypeError(`Unable to load "${script.id}" from server.`)
        const { deps = [], dynamicDeps = [], map } = transformResult
        const transformMs = performance.now() - transformStart
        if (shouldLogPerf(transformMs)) {
          perfDebug(
            'transform: id=%s url=%s ms=%d deps=%d dynamicDeps=%d',
            script.id,
            viteUrl,
            Math.round(transformMs),
            deps.length,
            dynamicDeps.length,
          )
        }
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
  const buildStart = performance.now()
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
  const buildMs = performance.now() - buildStart
  if (shouldLogPerf(buildMs)) {
    perfDebug(
      'iife build: id=%s input=%s fileName=%s ms=%d',
      script.id,
      input,
      fileName,
      Math.round(buildMs),
    )
  }

  // viteBuild with write: false returns RollupOutput or RollupOutput[]
  const outputs = Array.isArray(result) ? result : [result]
  const firstOutput = outputs[0]
  const output = 'output' in firstOutput ? firstOutput.output : undefined

  if (!output) {
    throw new Error(`Unable to generate IIFE bundle for "${script.id}"`)
  }

  const entryChunk = output.find(
    (item): item is OutputChunk => isOutputChunk(item) && item.isEntry,
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
    (item): item is OutputChunk => isOutputChunk(item) && !item.isEntry,
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
