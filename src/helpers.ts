import fs from 'fs-extra'
import { OutputChunk, OutputAsset } from 'rollup'

export const not = <T>(fn: (x: T) => boolean) => (x: T) => !fn(x)

export const loadAssetData = (assetPath: string) =>
  fs.readFile(assetPath).then((src) => [assetPath, src])

export const zipArrays = <T, X>(a1: T[], a2: X[]): [T, X][] =>
  a1.map((x, i) => [x, a2[i]])

export function isChunk(
  x: OutputChunk | OutputAsset,
): x is OutputChunk {
  return x.type === 'chunk'
}
