import { join, parse } from './path'
import { RPCEPlugin } from './types'

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
  p: RPCEPlugin | null | false | undefined,
) => !!(p && p.name === 'chrome-extension')

export function findRPCE(
  plugins: readonly RPCEPlugin[],
): RPCEPlugin | undefined {
  return plugins.find(isRPCE)
}
