import { resolve } from 'path'
import { OutputAsset, OutputChunk } from 'rollup'

export const getExtPath = (path: string) =>
  resolve(__dirname, 'extensions', path)

/**  Make relative to project root */
export const getRelative = (p: string) =>
  p.replace(process.cwd() + '/', '')

export function byFileName(n: string) {
  return ({ fileName }: OutputAsset | OutputChunk) =>
    fileName === n
}
