import { join, parse } from './path'
import { CrxPlugin } from './types'

export const esmImportWrapperFileNameExt = '.esm-wrapper.js'

export const generateFileNames = (fileName: string) => {
  const { dir, name } = parse(fileName)
  const wrapperFileName = join(
    dir,
    name + esmImportWrapperFileNameExt,
  )
  const outputFileName = join(dir, name + '.js')

  return { outputFileName, wrapperFileName }
}

export const isRPCE = (
  p: CrxPlugin | null | false | undefined,
) => !!(p && p.name === 'chrome-extension')

export function findCrx(
  plugins: readonly CrxPlugin[],
): CrxPlugin | undefined {
  return plugins.find(isRPCE)
}
