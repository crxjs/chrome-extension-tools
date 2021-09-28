import { join, parse } from 'path'

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
