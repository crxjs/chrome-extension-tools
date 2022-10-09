import { ViteDevServer } from 'vite'
import { outputFiles } from './fileWriter-filesMap'
import { _debug } from './helpers'
import { isAbsolute, join } from './path'
import { CrxDevAssetId, CrxDevScriptId } from './types'

const debug = _debug('file-writer').extend('utilities')

export type FileWriterId = {
  type: CrxDevAssetId['type'] | CrxDevScriptId['type'] | 'loader'
  id: string
}

/* ------------------- UTILITIES ------------------- */

/** Ensure that text starts with prefix text */
export function prefix(prefix: string, text: string) {
  return text.startsWith(prefix) ? text : prefix + text
}

/** Strip prefix from text */
export function strip(prefix: string, text: string) {
  return text?.startsWith(prefix) ? text?.slice(prefix.length) : text
}

/** Format script object values */
export function formatFileData<
  T extends {
    id: string
    type: 'module' | 'iife' | 'loader' | 'asset'
    fileName?: string
    loaderName?: string
  },
>(script: T): T {
  script.id = prefix('/', script.id)
  if (script.fileName) script.fileName = strip('/', script.fileName)
  if (script.loaderName) script.loaderName = strip('/', script.loaderName)
  return script
}

/**
 * Converts ScriptId to filename:
 *
 * - Filenames never start with a slash
 * - URL queries are converted to underscores and dashes
 */
export function getFileName({ type, id }: FileWriterId): string {
  let fileName = id
    .replace(/t=\d+&/, '') // filenames do not contain timestamps
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
  // { timestamp = false }: { timestamp?: boolean } = {},
  // if (timestamp && !id.startsWith('/@') && !id.includes('?v=')) {
  //   const t = `t=${Date.now()}` + (id.includes('?') ? '&' : '')
  //   const parts = id.split('?')
  //   parts[1] = typeof parts[1] === 'undefined' ? t : t + parts[1]
  //   id = parts.join('?')
  // }

  if (type === 'asset') {
    // TODO: verify if assets need special handling
    throw new Error(`File type "${type}" not implemented.`)
  } else if (type === 'iife') {
    // TODO: get worker script URL for IIFE
    throw new Error(`File type "${type}" not implemented.`)
  } else if (type === 'loader') {
    throw new Error('Vite does not transform loader files.')
  } else if (type === 'module') {
    // node_modules ids should not start with a slash
    if (id.startsWith('/@id/'))
      return id.slice('/@id/'.length).replace('__x00__', '\0')
    return prefix('/', id)
  } else {
    throw new Error(`Invalid file type: "${type}"`)
  }
}

/** Resolves when file and dependencies are written. */
export async function fileReady(script: FileWriterId): Promise<void> {
  const fileName = getFileName(script)
  const file = outputFiles.get(fileName)
  if (!file) throw new Error('unknown script type and id')
  const { deps } = await file.file
  await Promise.all(deps.map(fileReady))
}
