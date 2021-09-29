import { code as backgroundEsmWrapper } from 'code ./browser/code-backgroundEsmWrapper.ts'
import { generateFileNames } from './plugin_helpers'
import { isMV2, isMV3, RPCEPlugin } from './types'
import { VITE_SERVER_URL } from './viteAdaptor.machine'

/** Adds ESM support for the background page. Emits wrapper files and updates the manifest config. */
export const esmBackground = (): RPCEPlugin => {
  let isViteServe = false

  return {
    name: 'esm-background',
    configureServer() {
      isViteServe = true
    },
    renderCrxManifest(manifest) {
      if (isMV2(manifest) && manifest.background?.scripts) {
        const { scripts } = manifest.background
        manifest.background.scripts = scripts?.map(
          (fileName) => {
            const { outputFileName, wrapperFileName } =
              generateFileNames(fileName)

            const importPath = JSON.stringify(
              isViteServe
                ? `${VITE_SERVER_URL}/${fileName}`
                : `./${outputFileName}`,
            )

            this.emitFile({
              type: 'asset',
              fileName: wrapperFileName,
              source: backgroundEsmWrapper.replace(
                '%PATH%',
                importPath,
              ),
            })

            return wrapperFileName
          },
        )
      } else if (
        isMV3(manifest) &&
        manifest.background?.service_worker
      ) {
        manifest.background.type = 'module'
        if (isViteServe) {
          const { service_worker: sw } = manifest.background
          const { wrapperFileName } = generateFileNames(sw)

          const importPath = `${VITE_SERVER_URL}/${sw}`

          this.emitFile({
            type: 'asset',
            fileName: wrapperFileName,
            source: `import "${importPath}"`,
          })

          manifest.background.service_worker = wrapperFileName
        }
      }

      return manifest
    },
  }
}
