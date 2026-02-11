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
import { CrxDevAssetId, CrxDevScriptId, CrxPlugin } from './types'

export { allFilesReady, fileReady }

const { outputFile } = fsx

const debug = _debug('file-writer')

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
  serverEvent$.next({ type: 'start', server })

  const plugins = server.config.plugins.filter((p): p is CrxPlugin =>
    p.name?.startsWith('crx:'),
  )
  const { rollupOptions, outDir } = server.config.build
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

  await allFilesReady()
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
      file: write(script),
    })
    outputFiles.set(file.fileName, file)
    debug('add: stored new file %s', file.fileName)
  } else {
    // For virtual modules, always re-write since their content may have changed
    // Virtual modules don't have a file on disk, so we can't rely on file watchers
    const isVirtualModule =
      script.id.startsWith('/@id/') || script.id.startsWith('/__')
    if (isVirtualModule) {
      debug(
        'add: virtual module already exists, triggering re-write for %s',
        fileName,
      )
      file.file = write(script)
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
      scriptFile.file = write({ id, type })
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
  const deps = await firstValueFrom(
    // wait for start event
    start$.pipe(
      // prepare either asset or script contents
      prepFileData(fileId),
      // output file and add dependencies to file writer
      mergeMap(async ({ target, source, deps }) => {
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
        if (source instanceof Uint8Array) await outputFile(target, source)
        else await outputFile(target, source, { encoding: 'utf8' })
        return files
      }),
      // abort write operation on close event
      takeUntil(close$),
      concatWith(of([])),
    ),
  )
  const close = performance.now()
  return { start, close, deps }
}
