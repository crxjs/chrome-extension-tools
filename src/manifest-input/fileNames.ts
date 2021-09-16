import path from 'path'

export const chunkFileNames = 'modules/[name]-[hash].js'
export const entryFileNames = '[name].js'
export const assetFileNames = 'assets/[name]-[hash].[ext]'

export const chunkMatchPattern = 'modules/*.js'

export const esmImportWrapperFileNameExt = '.esm-wrapper.js'

// We use a stub so Rollup won't complain
//  b/c there are no initial inputs
//   we emit everything in buildStart
export const stubId = '__stubId'

export const generateFileNames = (
  x:
    | {
        srcDir: string
        id: string
      }
    | { fileName: string },
) => {
  const fileName =
    'fileName' in x ? x.fileName : path.relative(x.srcDir, x.id)
  const { dir, name } = path.parse(fileName)
  const wrapperFileName = path.join(
    dir,
    name + esmImportWrapperFileNameExt,
  )
  const jsFileName = path.join(dir, name + '.js')

  return { jsFileName, wrapperFileName, fileName }
}
