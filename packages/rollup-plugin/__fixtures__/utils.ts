import { readJsonSync } from 'fs-extra'
import { resolve, join, sep } from 'path'
import { OutputAsset, OutputChunk, OutputBundle } from 'rollup'

export const getTestName = (filename: string): string => {
  const result = filename.split('__').pop()?.split('.')?.shift()

  if (typeof result === 'string') {
    return result
  } else {
    throw new TypeError(`Invalid filename: ${filename}`)
  }
}

export const getCrxName = (filepath: string): string => {
  const [, crxName, crxParent] = filepath.split(sep).reverse()
  if (crxParent === 'extensions') return crxName
  throw new Error(`This is not a CRX fixture: ${filepath}`)
}

export const getExtPath = (...args: string[]): string =>
  resolve(__dirname, 'extensions', ...args)

export const getExtPathFromTestName = (testname: string, crxPath: string) => {
  const crxName = getTestName(testname)
  const relPath = join(crxName, crxPath)
  return getExtPath(relPath)
}

export const loadCrxJson = (filename: string, crxPath: string) => {
  const fullPath = getExtPathFromTestName(filename, crxPath)
  return readJsonSync(fullPath)
}

export const requireExtFile = (
  currentFilename: string,
  targetFilename: string,
) => {
  const testName = getTestName(currentFilename)

  return require(getExtPath(join(testName, targetFilename))).default
}

/** Make relative to project root */
export const getRelative = (p: string): string =>
  p.replace(process.cwd() + '/', '')

export function byFileName(n: string) {
  return ({ fileName }: OutputAsset | OutputChunk): boolean => fileName === n
}

/** Get the source of an OutputAsset as a string */
export const getAssetSource = (key: string, bundle: OutputBundle): string => {
  const asset = bundle[key] as OutputAsset

  if (!asset) {
    throw new Error(`Unable to find ${key} in bundle`)
  }

  if (asset.source instanceof Buffer) {
    return asset.source.toString('utf8')
  } else {
    return asset.source
  }
}
