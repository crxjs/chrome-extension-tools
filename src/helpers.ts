import { OutputOptions } from 'rollup'
import { OutputAsset, OutputChunk, OutputBundle } from 'rollup'
import { ChromeExtensionManifest } from './manifest'

export const not = <T>(fn: (x: T) => boolean) => (x: T) => !fn(x)

export function isChunk(
  x: OutputChunk | OutputAsset,
): x is OutputChunk {
  return x && x.type === 'chunk'
}

export function isOutputOptions(x: any): x is OutputOptions {
  return (
    typeof x === 'object' &&
    !Array.isArray(x) &&
    typeof x.format === 'string' &&
    ['iife', 'es'].includes(x.format)
  )
}

export function isAsset(
  x: OutputChunk | OutputAsset,
): x is OutputAsset {
  return x.type === 'asset'
}

export function isString(x: any): x is string {
  return typeof x === 'string'
}

export function isJsonFilePath(x: any): x is string {
  return isString(x) && x.endsWith('json')
}

/**
 * Update the manifest source in the output bundle
 */
export const updateManifest = (
  updater: (
    manifest: ChromeExtensionManifest,
  ) => ChromeExtensionManifest,
  bundle: OutputBundle,
  handleError?: (message: string) => void,
): OutputBundle => {
  try {
    const manifestKey = 'manifest.json'
    const manifestAsset = bundle[manifestKey] as OutputAsset

    if (!manifestAsset) {
      throw new Error(
        'No manifest.json in the rollup output bundle.',
      )
    }

    const manifest = JSON.parse(
      manifestAsset.source as string,
    ) as ChromeExtensionManifest

    const result = updater(manifest)

    manifestAsset.source = JSON.stringify(result, undefined, 2)
  } catch (error) {
    if (handleError) {
      handleError(error.message)
    } else {
      throw error
    }
  }

  return bundle
}
