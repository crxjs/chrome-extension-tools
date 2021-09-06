import { normalizePath } from '@rollup/pluginutils'
import path from 'path'
import { OutputAsset, Plugin } from 'rollup'
import { isChunk } from './helpers'

export const fixInvalidFileNames = (): Pick<
  Required<Plugin>,
  'name' | 'generateBundle'
> => ({
  name: 'fix-invalid-filenames',

  generateBundle(options, bundle) {
    const chunks = Object.values(bundle).filter(isChunk)

    // Files cannot start with "_" in Chrome Extensions, but folders CAN start with "_"
    // Rollup may output a helper file that starts with "_commonjsHelpers"
    // Loop through each file and check for "_commonjsHelpers" in filename
    Object.keys(bundle).forEach((fileName) => {
      const { dir, name, ext } = path.parse(fileName)

      if (!name.startsWith('_')) return

      // Only replace first instance
      const regex = new RegExp(fileName)
      const fixed = normalizePath(
        path.join(dir, name.slice(1) + ext),
      )

      // Fix manifest (ns why?)
      const manifest = bundle['manifest.json'] as OutputAsset & {
        source: string
      }
      manifest.source = manifest.source.replace(regex, fixed)

      // Change bundle key
      const chunk = bundle[fileName]
      delete bundle[fileName]
      bundle[fixed] = chunk

      // Fix chunk
      chunk.fileName = fixed

      // Find imports and fix
      chunks
        .filter(({ imports }) => imports.includes(fileName))
        .forEach((chunk) => {
          // Fix imports list
          chunk.imports = chunk.imports.map((i) =>
            i === fileName ? fixed : i,
          )
          // Fix imports in code
          chunk.code = chunk.code.replace(regex, fixed)
        })
    })
  },
})
