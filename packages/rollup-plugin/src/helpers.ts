import { OutputOptions } from 'rollup'
import { OutputAsset, OutputChunk, OutputBundle } from 'rollup'

export type Unpacked<T> = T extends Array<infer R> ? R : never

export const not =
  <T>(fn: (x: T) => boolean) =>
  (x: T) =>
    !fn(x)

export function isChunk(x: OutputChunk | OutputAsset): x is OutputChunk {
  return x && x.type === 'chunk'
}

export function isErrorLike(x: unknown): x is Error {
  return typeof x === 'object' && x !== null && 'message' in x
}

export function isOutputOptions(x: any): x is OutputOptions {
  return (
    typeof x === 'object' &&
    !Array.isArray(x) &&
    typeof x.format === 'string' &&
    ['iife', 'es'].includes(x.format)
  )
}

export function isAsset(x: OutputChunk | OutputAsset): x is OutputAsset {
  return x.type === 'asset'
}

export function isString(x: any): x is string {
  return typeof x === 'string'
}

export function isUndefined(x: unknown): x is undefined {
  return typeof x === 'undefined'
}

export function isNull(x: unknown): x is null {
  return x === null
}

export function isPresent<T>(x: null | undefined | T): x is T {
  return !isUndefined(x) && !isNull(x)
}

export const normalizeFilename = (p: string) => p.replace(/\.[tj]sx?$/, '.js')

/** Update the manifest source in the output bundle */
export const updateManifest = <T extends chrome.runtime.Manifest>(
  updater: (manifest: T) => T,
  bundle: OutputBundle,
  handleError?: (message: string) => void,
): OutputBundle => {
  try {
    const manifestKey = 'manifest.json'
    const manifestAsset = bundle[manifestKey] as OutputAsset

    if (!manifestAsset) {
      throw new Error('No manifest.json in the rollup output bundle.')
    }

    const manifest = JSON.parse(manifestAsset.source as string) as T

    const result = updater(manifest)

    manifestAsset.source = JSON.stringify(result, undefined, 2)
  } catch (error) {
    if (handleError && error instanceof Error) {
      handleError(error.message)
    } else {
      throw error
    }
  }

  return bundle
}
