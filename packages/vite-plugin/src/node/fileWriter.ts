import fsx from 'fs-extra'
import { performance } from 'perf_hooks'
import { OutputOptions, rollup, RollupOptions } from 'rollup'
import { concatWith, firstValueFrom, mergeMap, of, takeUntil } from 'rxjs'
import { ViteDevServer } from 'vite'
import { OutputFile, outputFiles } from './fileWriter-filesMap'
import {
  allFilesReady,
  close$,
  fileWriterEvent$,
  prepFileData,
  serverEvent$,
  start$,
} from './fileWriter-rxjs'
import {
  fileReady,
  formatFileData,
  getFileName,
  prefix,
} from './fileWriter-utilities'
import { _debug } from './helpers'
import { isAbsolute, join } from './path'
import { CrxDevAssetId, CrxDevScriptId, CrxPlugin } from './types'

export { allFilesReady, fileReady }

const { outputFile } = fsx

const debug = _debug('file-writer')
const perfDebug = debug.extend('perf')
const progressDebug = debug.extend('progress')
function readIntegerEnv(name: string, fallback: number) {
  const value = process.env[name]
  if (!value) return fallback
  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) ? parsed : fallback
}
const maxConcurrentWrites = Math.max(
  1,
  readIntegerEnv('CRX_FILE_WRITER_CONCURRENCY', 16),
)
const perfThresholdMs = Math.max(
  0,
  readIntegerEnv('CRX_FILE_WRITER_PERF_THRESHOLD_MS', 250),
)
const progressIntervalMs = Math.max(
  250,
  readIntegerEnv('CRX_FILE_WRITER_PROGRESS_INTERVAL_MS', 1000),
)
let activeWrites = 0
const pendingWriteSlots: Array<() => void> = []

interface WriterStats {
  bytes: number
  outputWrites: number
  viteDepBytes: number
  viteDepWrites: number
  viteDepChunks: number
  viteDepHashes: Set<string>
  queuedWrites: number
  maxQueueDepth: number
  maxSlotWaitMs: number
  maxSlotWaitId: string
  maxOutputWriteMs: number
  maxOutputWriteId: string
  maxWriteMs: number
  maxWriteId: string
  writesCompleted: number
}

const writerStats: WriterStats = {
  bytes: 0,
  outputWrites: 0,
  viteDepBytes: 0,
  viteDepWrites: 0,
  viteDepChunks: 0,
  viteDepHashes: new Set(),
  queuedWrites: 0,
  maxQueueDepth: 0,
  maxSlotWaitMs: 0,
  maxSlotWaitId: '',
  maxOutputWriteMs: 0,
  maxOutputWriteId: '',
  maxWriteMs: 0,
  maxWriteId: '',
  writesCompleted: 0,
}

function shouldLogPerf(ms: number) {
  return perfThresholdMs === 0 || ms >= perfThresholdMs
}

function resetWriterStats() {
  writerStats.bytes = 0
  writerStats.outputWrites = 0
  writerStats.viteDepBytes = 0
  writerStats.viteDepWrites = 0
  writerStats.viteDepChunks = 0
  writerStats.viteDepHashes.clear()
  writerStats.queuedWrites = 0
  writerStats.maxQueueDepth = 0
  writerStats.maxSlotWaitMs = 0
  writerStats.maxSlotWaitId = ''
  writerStats.maxOutputWriteMs = 0
  writerStats.maxOutputWriteId = ''
  writerStats.maxWriteMs = 0
  writerStats.maxWriteId = ''
  writerStats.writesCompleted = 0
}

function formatFileId(fileId: CrxDevAssetId | CrxDevScriptId) {
  return `${fileId.type}:${fileId.id}`
}

function getViteDepHash(id: string) {
  if (!id.includes('/node_modules/.vite/deps/')) return
  return /[?&]v=([^&]+)/.exec(id)?.[1] ?? 'no-v'
}

function isViteDepChunk(id: string) {
  return id.includes('/node_modules/.vite/deps/chunk-')
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes}B`
  const kib = bytes / 1024
  if (kib < 1024) return `${kib.toFixed(1)}KiB`
  return `${(kib / 1024).toFixed(1)}MiB`
}

function formatDurationSeconds(seconds: number) {
  if (!Number.isFinite(seconds)) return 'unknown'
  if (seconds < 10) return `${seconds.toFixed(1)}s`
  return `${Math.round(seconds)}s`
}

function logProgress(startTime: number, phase: string) {
  const elapsedSeconds = Math.max((performance.now() - startTime) / 1000, 0.001)
  const discoveredFiles = outputFiles.size
  const completedWrites = writerStats.writesCompleted
  const percent =
    discoveredFiles > 0
      ? Math.min(100, (completedWrites / discoveredFiles) * 100)
      : 0
  const writesPerSecond = completedWrites / elapsedSeconds
  const remainingWrites = Math.max(discoveredFiles - completedWrites, 0)
  const etaSeconds =
    writesPerSecond > 0 && remainingWrites > 0
      ? remainingWrites / writesPerSecond
      : 0

  progressDebug(
    'phase=%s files=%d/%d discovered pct=%s active=%d queued=%d bytes=%s viteDeps=%d chunks=%d rate=%s/s eta=%s elapsed=%s',
    phase,
    completedWrites,
    discoveredFiles,
    `${percent.toFixed(1)}%`,
    activeWrites,
    pendingWriteSlots.length,
    formatBytes(writerStats.bytes),
    writerStats.viteDepWrites,
    writerStats.viteDepChunks,
    writesPerSecond.toFixed(1),
    formatDurationSeconds(etaSeconds),
    formatDurationSeconds(elapsedSeconds),
  )
}

function startProgressTimer(startTime: number, getPhase: () => string) {
  if (!progressDebug.enabled) return
  progressDebug(
    'begin: interval=%dms note=%s',
    progressIntervalMs,
    'total is discovered files and may grow during graph discovery',
  )
  const timer = setInterval(
    () => logProgress(startTime, getPhase()),
    progressIntervalMs,
  )
  timer.unref?.()
  return (phase = getPhase()) => {
    clearInterval(timer)
    logProgress(startTime, phase)
  }
}

interface ViteDepsMetadata {
  hash?: string
  browserHash?: string
  optimized?: Record<string, unknown>
  chunks?: Record<string, unknown>
}

async function logViteDepsMetadata(server: ViteDevServer) {
  const { cacheDir, root } = server.config
  const metadataPath = join(
    isAbsolute(cacheDir) ? cacheDir : join(root, cacheDir),
    'deps',
    '_metadata.json',
  )
  try {
    const metadata = (await fsx.readJson(metadataPath)) as ViteDepsMetadata
    perfDebug(
      'vite deps metadata: hash=%s browserHash=%s optimized=%d chunks=%d path=%s',
      metadata.hash ?? 'n/a',
      metadata.browserHash ?? 'n/a',
      Object.keys(metadata.optimized ?? {}).length,
      Object.keys(metadata.chunks ?? {}).length,
      metadataPath,
    )
  } catch (error) {
    perfDebug(
      'vite deps metadata: unavailable path=%s error=%s',
      metadataPath,
      error instanceof Error ? error.message : String(error),
    )
  }
}

async function withWriteSlot<T>(
  fileId: CrxDevAssetId | CrxDevScriptId,
  fn: () => Promise<T>,
): Promise<T> {
  const queuedAt = performance.now()
  const queuedDepth = pendingWriteSlots.length + 1
  let waited = false
  if (activeWrites >= maxConcurrentWrites) {
    waited = true
    writerStats.queuedWrites += 1
    writerStats.maxQueueDepth = Math.max(writerStats.maxQueueDepth, queuedDepth)
    await new Promise<void>((resolve) => pendingWriteSlots.push(resolve))
  }

  const waitMs = performance.now() - queuedAt
  if (waited && waitMs > writerStats.maxSlotWaitMs) {
    writerStats.maxSlotWaitMs = waitMs
    writerStats.maxSlotWaitId = formatFileId(fileId)
  }
  if (waited && shouldLogPerf(waitMs)) {
    perfDebug(
      'slot wait: id=%s type=%s wait=%dms active=%d max=%d queued=%d',
      fileId.id,
      fileId.type,
      Math.round(waitMs),
      activeWrites,
      maxConcurrentWrites,
      queuedDepth,
    )
  }

  activeWrites += 1
  try {
    return await fn()
  } finally {
    activeWrites -= 1
    pendingWriteSlots.shift()?.()
  }
}

function queueWrite(
  script: CrxDevAssetId | CrxDevScriptId,
  previous?: OutputFile,
) {
  if (!previous) return write(script)

  return previous.file
    .catch(() => undefined)
    .then(() => write(script))
}

/**
 * Starts the file writer.
 *
 * - Signals write() to start by providing the Vite Dev Server.
 * - Runs Rollup with internal plugins to output the CRX base.
 * - CRX base includes: manifest, loader files, and public folder.
 * - Output is pure assets, no actual scripts.
 * - Resolves when Rollup completes.
 */
export async function start({
  server,
}: {
  server: ViteDevServer
}): Promise<void> {
  const startTime = performance.now()
  let phase = 'base-build'
  const stopProgress = startProgressTimer(startTime, () => phase)
  resetWriterStats()
  serverEvent$.next({ type: 'start', server })

  const plugins = server.config.plugins.filter((p): p is CrxPlugin =>
    p.name?.startsWith('crx:'),
  )
  const { rollupOptions, outDir } = server.config.build
  perfDebug(
    'startup begin: concurrency=%d threshold=%dms root=%s outDir=%s',
    maxConcurrentWrites,
    perfThresholdMs,
    server.config.root,
    outDir,
  )
  await logViteDepsMetadata(server)
  const inputOptions: RollupOptions = {
    input: 'index.html',
    ...rollupOptions,
    plugins,
  }
  // handle the various output option types
  const rollupOutputOptions = [rollupOptions.output].flat()[0]
  const outputOptions: OutputOptions = {
    ...rollupOutputOptions,
    dir: outDir,
    format: 'es',
  }

  fileWriterEvent$.next({ type: 'build_start' })
  const build = await rollup(inputOptions)
  await build.write(outputOptions)
  fileWriterEvent$.next({ type: 'build_end' })
  phase = 'writing'
  perfDebug(
    'start: base build completed in %dms',
    Math.round(performance.now() - startTime),
  )

  try {
    await allFilesReady()
    phase = 'ready'
  } finally {
    stopProgress?.(phase)
  }
  perfDebug(
    'start: all files ready in %dms files=%d',
    Math.round(performance.now() - startTime),
    outputFiles.size,
  )
  perfDebug(
    'startup summary: files=%d writes=%d outputWrites=%d bytes=%d viteDepWrites=%d viteDepChunks=%d viteDepBytes=%d viteDepHashes=%s queuedWrites=%d maxQueueDepth=%d maxSlotWait=%dms maxSlotWaitId=%s maxWrite=%dms maxWriteId=%s maxOutputWrite=%dms maxOutputWriteId=%s',
    outputFiles.size,
    writerStats.writesCompleted,
    writerStats.outputWrites,
    writerStats.bytes,
    writerStats.viteDepWrites,
    writerStats.viteDepChunks,
    writerStats.viteDepBytes,
    [...writerStats.viteDepHashes].sort().join(',') || 'n/a',
    writerStats.queuedWrites,
    writerStats.maxQueueDepth,
    Math.round(writerStats.maxSlotWaitMs),
    writerStats.maxSlotWaitId || 'n/a',
    Math.round(writerStats.maxWriteMs),
    writerStats.maxWriteId || 'n/a',
    Math.round(writerStats.maxOutputWriteMs),
    writerStats.maxOutputWriteId || 'n/a',
  )
}

/** Signals write() to abandon operations. */
export async function close(): Promise<void> {
  serverEvent$.next({ type: 'close' })
}

/**
 * Gets or creates a script module by id + type.
 *
 * - Calls write() when creating, no-op if file exists.
 */
export function add(script: CrxDevAssetId | CrxDevScriptId): OutputFile {
  const fileName = getFileName(script)
  debug(
    'add: script.id=%s script.type=%s fileName=%s',
    script.id,
    script.type,
    fileName,
  )
  let file = outputFiles.get(fileName)
  if (typeof file === 'undefined') {
    file = formatFileData({
      ...script,
      fileName,
      file: queueWrite(script),
    })
    outputFiles.set(file.fileName, file)
    debug('add: stored new file %s', file.fileName)
  } else {
    // For virtual modules, always re-write since their content may have changed
    // Virtual modules don't have a file on disk, so we can't rely on file watchers
    const isVirtualModule =
      script.id.startsWith('/@id/') || script.id.startsWith('/__')
    const isTimestampedModule =
      script.type === 'module' && /[?&]t=\d+/.test(script.id)
    if (isVirtualModule || isTimestampedModule) {
      debug(
        'add: module already exists, triggering re-write for %s',
        fileName,
      )
      file = formatFileData({
        ...file,
        ...script,
        fileName,
        file: queueWrite(script, file),
      })
      outputFiles.set(fileName, file)
    }
  }
  return file
}

/**
 * Calls write() on each existing type of script.
 *
 * - It is possible for multiple scripts to have the same id with different types.
 * - Loaders don't get updated.
 */
export function update(_id: string): OutputFile[] {
  const id = prefix('/', _id)
  const types = ['iife', 'module'] as const
  const updatedFiles: OutputFile[] = []
  debug('update called: _id=%s id=%s', _id, id)
  for (const type of types) {
    const fileName = getFileName({ id, type })
    debug('update: looking for fileName=%s', fileName)
    const scriptFile = outputFiles.get(fileName)
    if (scriptFile) {
      debug('update: found file, calling write()')
      scriptFile.file = queueWrite({ id, type }, scriptFile)
      updatedFiles.push(scriptFile)
      // trigger scriptFiles change, scriptFile is already formatted
      outputFiles.set(fileName, scriptFile)
    }
  }
  debug('update: returning %d files', updatedFiles.length)
  return updatedFiles
}

/**
 * Gets file content from Vite Dev Server and writes it to file system.
 *
 * - Resolves when the file is written.
 * - Calls add() on each file dependency.
 * - Waits until the dev server is running.
 */
export async function write(
  fileId: CrxDevAssetId | CrxDevScriptId,
): Promise<{ start: number; close: number; deps: OutputFile[] }> {
  const start = performance.now()
  const deps = await withWriteSlot(fileId, () =>
    firstValueFrom(
      // wait for start event
      start$.pipe(
        // prepare either asset or script contents
        prepFileData(fileId),
        // output file and add dependencies to file writer
        mergeMap(async ({ target, source, deps }) => {
          const addDepsStart = performance.now()
          const files = deps
            .map((id: string) => {
              const r = [add({ id, type: 'module' })]
              if (id.includes('?import')) {
                const [imported] = id.split('?import')
                r.push(add({ id: imported, type: 'asset' }))
              }
              return r
            })
            .flat()
          const addDepsMs = performance.now() - addDepsStart
          if (shouldLogPerf(addDepsMs)) {
            perfDebug(
              'deps add: id=%s type=%s deps=%d files=%d ms=%d',
              fileId.id,
              fileId.type,
              deps.length,
              files.length,
              Math.round(addDepsMs),
            )
          }

          const outputStart = performance.now()
          if (source instanceof Uint8Array) await outputFile(target, source)
          else await outputFile(target, source, { encoding: 'utf8' })
          const outputMs = performance.now() - outputStart
          writerStats.outputWrites += 1
          writerStats.bytes += source.length
          const viteDepHash = getViteDepHash(fileId.id)
          if (viteDepHash) {
            writerStats.viteDepWrites += 1
            writerStats.viteDepBytes += source.length
            writerStats.viteDepHashes.add(viteDepHash)
            if (isViteDepChunk(fileId.id)) writerStats.viteDepChunks += 1
          }
          if (outputMs > writerStats.maxOutputWriteMs) {
            writerStats.maxOutputWriteMs = outputMs
            writerStats.maxOutputWriteId = formatFileId(fileId)
          }
          if (shouldLogPerf(outputMs)) {
            perfDebug(
              'output write: id=%s type=%s bytes=%d ms=%d target=%s',
              fileId.id,
              fileId.type,
              source.length,
              Math.round(outputMs),
              target,
            )
          }
          return files
        }),
        // abort write operation on close event
        takeUntil(close$),
        concatWith(of([])),
      ),
    ),
  )
  const close = performance.now()
  const totalMs = close - start
  writerStats.writesCompleted += 1
  if (totalMs > writerStats.maxWriteMs) {
    writerStats.maxWriteMs = totalMs
    writerStats.maxWriteId = formatFileId(fileId)
  }
  if (shouldLogPerf(totalMs)) {
    perfDebug(
      'write complete: id=%s type=%s total=%dms deps=%d',
      fileId.id,
      fileId.type,
      Math.round(totalMs),
      deps.length,
    )
  }
  return { start, close, deps }
}
