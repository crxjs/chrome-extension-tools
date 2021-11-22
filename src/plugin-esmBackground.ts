import { code as backgroundEsmWrapper } from 'code ./browser/code-backgroundEsmWrapper.ts'
import { parse } from './path'
import { generateFileNames } from './plugin_helpers'
import { CrxPlugin, isMV2, isMV3 } from './types'

/** Adds ESM support for the background page. Emits wrapper files and updates the manifest config. */
export const esmBackground = (): CrxPlugin => {
  return {
    name: 'esm-background',
    crx: true,
    renderCrxManifest(manifest) {
      if (isMV2(manifest) && manifest.background?.scripts) {
        const { scripts } = manifest.background
        manifest.background.scripts = scripts?.map(
          (fileName) => {
            const { outputFileName, wrapperFileName } =
              generateFileNames(fileName)

            const { base } = parse(outputFileName)
            // wrapper has same dirname as output file
            const importPath = `./${base}`

            this.emitFile({
              type: 'asset',
              fileName: wrapperFileName,
              source: backgroundEsmWrapper.replace(
                '%PATH%',
                JSON.stringify(importPath),
              ),
            })

            return wrapperFileName
          },
        )
      } else if (
        isMV3(manifest) &&
        manifest.background?.service_worker
      ) {
        const { service_worker: sw } = manifest.background
        const { outputFileName } = generateFileNames(sw)

        manifest.background.service_worker = outputFileName
        manifest.background.type = 'module'
      }

      return manifest
    },
  }
}
