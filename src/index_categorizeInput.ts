import { RollupOptions } from 'rollup'
import { isString } from './helpers'
import { isAbsolute, join } from './path'
import { stubId } from './stubId'
import { BaseAsset } from './types'

export function categorizeInput(
  input: RollupOptions['input'] = [],
  filter: Record<'HTML' | 'MANIFEST', (id: string) => boolean>,
): {
  crxFiles: BaseAsset[]
  finalInput: string[] | { [entryAlias: string]: string }
} {
  function getAbsolutePath(input: string): string {
    return isAbsolute(input) ? input : join(process.cwd(), input)
  }

  let finalInput: RollupOptions['input'] = [stubId]
  const crxFiles: BaseAsset[] = []
  if (isString(input) && input.endsWith('index.html')) {
    // Vite passes "<root>/index.html" as default input
    // do nothing, the default manifest should work
  } else if (isString(input) && filter.MANIFEST(input)) {
    crxFiles.push({
      id: getAbsolutePath(input),
      fileType: 'MANIFEST',
      fileName: 'manifest.json',
    })
  } else if (Array.isArray(input)) {
    const result: string[] = []
    for (const id of input.sort((a) =>
      filter.MANIFEST(a) ? -1 : 0,
    )) {
      if (filter.MANIFEST(id)) {
        const filePath = getAbsolutePath(id)
        crxFiles.push({
          id: filePath,
          fileType: 'MANIFEST',
          fileName: 'manifest.json',
        })
      } else if (filter.HTML(id)) {
        crxFiles.push({
          id: getAbsolutePath(id),
          fileType: 'HTML',
          fileName: id,
        })
      } else {
        result.push(id)
      }
    }

    if (result.length) finalInput = result
  } else {
    const result: [string, string][] = []
    for (const [fileName, id] of Object.entries(input)) {
      if (filter.HTML(id)) {
        crxFiles.push({
          id: getAbsolutePath(id),
          fileType: 'HTML',
          fileName: fileName.endsWith('.html')
            ? fileName
            : fileName + '.html',
        })
      } else if (filter.MANIFEST(id)) {
        crxFiles.push({
          id: getAbsolutePath(id),
          fileType: 'MANIFEST',
          fileName: 'manifest.json',
        })
      } else {
        result.push([fileName, id])
      }
    }

    if (result.length) finalInput = Object.fromEntries(result)
  }

  return { crxFiles, finalInput }
}
