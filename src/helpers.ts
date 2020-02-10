import { OutputAsset, OutputChunk } from 'rollup'

export const not = <T>(fn: (x: T) => boolean) => (x: T) => !fn(x)

export function isChunk(
  x: OutputChunk | OutputAsset,
): x is OutputChunk {
  return x.type === 'chunk'
}

export function isAsset(
  x: OutputChunk | OutputAsset,
): x is OutputChunk {
  return x.type === 'asset'
}

export function isString(x: any): x is string {
  return typeof x === 'string'
}

export const formatHtml = ($: CheerioFile) =>
  prettier.format($.html(), { parser: 'html' })
