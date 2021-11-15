import { code as backgroundEsmWrapper } from 'code ./browser/code-backgroundEsmWrapper.ts'
import { ViteDevServer } from 'vite'
import { isUndefined } from './helpers'
import { parse } from './path'
import { generateFileNames } from './plugin_helpers'
import { isMV2, isMV3, RPCEPlugin } from './types'

/** Adds ESM support for the background page. Emits wrapper files and updates the manifest config. */
export const esmBackground = (): RPCEPlugin => {
  let server: ViteDevServer | undefined

  return {
    name: 'esm-background',
    configureServer(s) {
      server = s
    },
    renderCrxManifest(manifest) {
      if (isMV2(manifest) && manifest.background?.scripts) {
        const { scripts } = manifest.background
        manifest.background.scripts = scripts?.map(
          (fileName) => {
            const { outputFileName, wrapperFileName } =
              generateFileNames(fileName)

            const { port } = server?.config.server ?? {}

            let importPath: string
            if (isUndefined(port)) {
              const { base } = parse(outputFileName)
              // wrapper has same dirname as output file
              importPath = `./${base}`
            } else {
              importPath = `${`http://localhost:${port}`}/${fileName}`
            }

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
        manifest.background.type = 'module'
        const { service_worker: sw } = manifest.background
        const { wrapperFileName, outputFileName } =
          generateFileNames(sw)

        const { port } = server?.config.server ?? {}

        if (isUndefined(port)) {
          manifest.background.service_worker = outputFileName
        } else {
          const importPath = `${`http://localhost:${port}`}/${sw}`

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
