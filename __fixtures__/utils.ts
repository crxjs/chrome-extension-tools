import { resolve } from 'path'
import { OutputAsset, OutputChunk, OutputBundle } from 'rollup'

export const getExtPath = (path: string): string =>
  resolve(__dirname, 'extensions', path)

/**  Make relative to project root */
export const getRelative = (p: string): string =>
  p.replace(process.cwd() + '/', '')

export function byFileName(n: string) {
  return ({ fileName }: OutputAsset | OutputChunk): boolean =>
    fileName === n
}

/**
 * Get the source of an OutputAsset as a string
 */
export const getAssetSource = (
  key: string,
  bundle: OutputBundle,
): string => {
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
