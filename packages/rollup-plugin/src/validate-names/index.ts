import { basename } from 'path'
import { OutputAsset, OutputChunk, Plugin } from 'rollup'

interface ManifestAsset extends OutputAsset {
  source: string
}

export type ValidateNamesPlugin = Pick<
  Required<Plugin>,
  'name' | 'generateBundle'
>

export const validateNames = (): ValidateNamesPlugin => ({
  name: 'validate-names',

  generateBundle(options, bundle) {
    const chunks = Object.values(bundle).filter(
      (x): x is OutputChunk => x.type === 'chunk',
    )

    // Files cannot start with "_" in Chrome Extensions, but folders CAN start with "_"
    // Rollup may output a helper file that starts with "_commonjsHelpers"
    // Loop through each file and check for "_commonjsHelpers" in filename
    Object.keys(bundle)
      .filter((fileName) => basename(fileName).startsWith('_commonjsHelpers'))
      .forEach((fileName) => {
        // Only replace first instance
        const regex = new RegExp(fileName)
        const [base, ...rest] = fileName.split('/').reverse()
        const fixed = [base.slice(1), ...rest].reverse().join('/')

        // Fix manifest
        const manifest = bundle['manifest.json'] as ManifestAsset
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
