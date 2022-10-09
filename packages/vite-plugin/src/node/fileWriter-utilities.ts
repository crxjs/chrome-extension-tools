import { firstValueFrom, map, switchMap } from 'rxjs'
import { ViteDevServer } from 'vite'
import { scriptFiles, ScriptId } from './fileWriter-filesMap'
import { isAbsolute, join } from './path'

/* ------------------- UTILITIES ------------------- */

/** Converts ScriptId to string */
export function getFileName({ type, id }: ScriptId): string {
  // TODO: handle URL queries
  const fileName = id
  switch (type) {
    case 'iife':
      return `${fileName}.iife.js`
    case 'loader':
      return `${fileName}.loader.js`
    default:
      return `${fileName}.js`
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
export function getViteUrl({ type, id }: ScriptId) {
  if (type === 'asset') {
    // TODO: verify if assets need special handling
    throw new Error(`File type "${type}" not implemented.`)
  } else if (type === 'iife') {
    // TODO: get worker script URL for IIFE
    throw new Error(`File type "${type}" not implemented.`)
  } else if (type === 'loader') {
    throw new Error('Vite does not transform loader files.')
  } else if (type === 'module') {
    return id
  } else {
    throw new Error(`Invalid file type: "${type}"`)
  }
}

/** Resolves when file and dependencies are written. */
export async function fileReady(script: ScriptId): Promise<void> {
  const key = getFileName(script)
  const scriptFile = scriptFiles.get(key)
  if (!scriptFile) throw new Error('unknown script type and id')
  const file = await scriptFile.file
  await Promise.all(file.deps.map(fileReady))
}

/** Resolves when all existing files in scriptFiles are written. */
export async function allFilesReady(): Promise<void> {
  await firstValueFrom(
    scriptFiles.change$.pipe(
      map(() => [...scriptFiles.values()]),
      switchMap((files) => Promise.all(files.map(({ file }) => file))),
    ),
  )
}
