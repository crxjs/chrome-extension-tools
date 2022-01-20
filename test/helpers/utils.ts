import path from 'path'
import { OutputAsset, OutputBundle, OutputChunk } from 'rollup'

export const testDir = path.resolve(__dirname, '..')

export function byFileName(n: string | RegExp) {
  return ({ fileName }: OutputAsset | OutputChunk): boolean =>
    n instanceof RegExp ? n.test(fileName) : fileName === n
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

  if (asset.source instanceof Uint8Array) {
    return asset.source.toString()
  } else {
    return asset.source
  }
}
