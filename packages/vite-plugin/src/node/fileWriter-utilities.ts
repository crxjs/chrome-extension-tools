import { firstValueFrom, map, startWith, switchMap } from 'rxjs'
import { ViteDevServer } from 'vite'
import { scriptFiles } from './fileWriter-filesMap'
import { buildEnd$ } from './fileWriter-rxjs'
import { _debug } from './helpers'
import { isAbsolute, join } from './path'
import { CrxDevAssetId, CrxDevScriptId } from './types'

const debug = _debug('file-writer').extend('utilities')

export type FileWriterId = {
  type: CrxDevAssetId['type'] | CrxDevScriptId['type'] | 'loader'
  id: string
}

/* ------------------- UTILITIES ------------------- */

/** Converts ScriptId to string */
export function getFileName({ type, id }: FileWriterId): string {
  let fileName = id
    .replace(/^\//, '') // filenames do not start with a slash
    .replace(/\?/g, '__') // convert url queries
    .replace(/&/g, '_')
    .replace(/=/g, '--')
  if (fileName.includes('node_modules/')) {
    fileName = `vendor/${fileName
      .split('node_modules/')
      .pop()!
      .replace(/\//g, '-')}`
  } else if (fileName.startsWith('@')) {
    fileName = `vendor/${fileName.slice('@'.length).replace(/\//g, '-')}`
  } else if (fileName.startsWith('.vite/deps/')) {
    fileName = `vendor/${fileName.slice('.vite/deps/'.length)}`
    console.log(fileName)
  }

  switch (type) {
    case 'iife':
      return `${fileName}.iife.js`
    case 'loader':
      return `${fileName}-loader.js`
    case 'module':
      return `${fileName}.js`
    case 'asset':
      return fileName
    default:
      throw new Error(
        `Unexpected script type "${type}" for "${JSON.stringify({
          type,
          id,
        })}"`,
      )
  }
}

/** Converts a file name to an absolute filename */
export function getOutputPath(server: ViteDevServer, fileName: string) {
  const {
    root,
    build: { outDir },
  } = server.config
  const target = isAbsolute(outDir)
    ? join(outDir, fileName)
    : join(root, outDir, fileName)
  return target
}

/** Converts a script to the correct Vite URL */
export function getViteUrl({ type, id }: FileWriterId) {
  if (type === 'asset') {
    // TODO: verify if assets need special handling
    throw new Error(`File type "${type}" not implemented.`)
  } else if (type === 'iife') {
    // TODO: get worker script URL for IIFE
    throw new Error(`File type "${type}" not implemented.`)
  } else if (type === 'loader') {
    throw new Error('Vite does not transform loader files.')
  } else if (type === 'module') {
    return id.startsWith('/') ? id : `/${id}`
  } else {
    throw new Error(`Invalid file type: "${type}"`)
  }
}

/** Resolves when file and dependencies are written. */
export async function fileReady(script: FileWriterId): Promise<void> {
  const key = getFileName(script)
  const scriptFile = scriptFiles.get(key)
  if (!scriptFile) throw new Error('unknown script type and id')
  const file = await scriptFile.file
  await Promise.all(file.deps.map(fileReady))
}

/** Resolves when all existing files in scriptFiles are written. */
export async function allFilesReady(): Promise<void> {
  await firstValueFrom(buildEnd$)
  await firstValueFrom(
    scriptFiles.change$.pipe(
      startWith(0),
      map(() => [...scriptFiles.values()]),
      switchMap((files) => Promise.all(files.map(({ file }) => file))),
    ),
  )
  debug('allFilesReady')
}
