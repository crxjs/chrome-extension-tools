import path from 'path'

// We use a stub if the manifest has no scripts
//   eg, a CSS only Chrome Extension
export const stubIdForNoScriptChromeExtensions =
  '__stubIdForNoScriptChromeExtensions'

export const esmImportWrapperFileNameExt = '.esm-wrapper.js'
export const generateContentScriptFileNames = (
  x:
    | {
        srcDir: string
        srcPath: string
      }
    | { fileName: string },
) => {
  const fileName =
    'fileName' in x
      ? x.fileName
      : path.relative(x.srcDir, x.srcPath)
  const { dir, name } = path.parse(fileName)
  const wrapperFileName = path.join(
    dir,
    name + esmImportWrapperFileNameExt,
  )
  const jsFileName = path.join(dir, name + '.js')

  return { jsFileName, wrapperFileName, fileName }
}
