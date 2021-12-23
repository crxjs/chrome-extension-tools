// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { code as backgroundEsmWrapper } from 'code ./browser/code-backgroundEsmWrapper.ts'
import jsesc from 'jsesc'
import { parse } from './path'
import { generateFileNames } from './plugin_helpers'
import { CrxPlugin, isMV2 } from './types'

/**
 * Adds ESM support for the background page, for two reasons:
 * - We want to avoid regenerating unnecessary IIFEs
 * - Vite serve support requires ESM
 *
 * Emits wrapper files and updates the manifest config.
 */
export const backgroundESM_MV2 = (): CrxPlugin => {
  return {
    name: 'background-esm-mv2',
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
                jsesc(importPath),
              ),
            })

            return wrapperFileName
          },
        )
      }

      return manifest
    },
  }
}
