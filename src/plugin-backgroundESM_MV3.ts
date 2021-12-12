import { format } from './helpers'
import { parse } from './path'
import { generateFileNames } from './plugin_helpers'
import { CrxPlugin, isMV3 } from './types'

export const swWrapperName = 'root-scope-service-worker.js'
export const swComment = format`
/**
 * rollup-plugin-chrome-extension enables HMR during Vite serve mode
 * by intercepting fetch requests and routing them to the dev server.
 * 
 * Service workers can only intercept requests inside their scope (folder),
 * so the service worker must be located at the root of the Chrome Extension
 * to handle all use cases.
 * 
 * See https://stackoverflow.com/a/35780776/4842857 for more details.
 * 
 * This import wrapper at the root of the Chrome Extension guarantees that
 * the background service worker will behave the same during
 * development and production.
 */`

/**
 * Adds ESM support for the background page, for two reasons:
 * - We want to avoid regenerating unnecessary IIFEs
 * - Vite serve support requires ESM
 *
 * Moves the background entry point to the CRX root,
 * since service workers behave differently depending on their location
 *
 * Emits wrapper files and updates the manifest config.
 */
export const backgroundESM_MV3 = (): CrxPlugin => {
  let isRollup = true
  return {
    name: 'background-esm-mv3',
    crx: true,
    config() {
      isRollup = false
    },
    renderCrxManifest(manifest) {
      if (
        isMV3(manifest) &&
        manifest.background?.service_worker
      ) {
        const { service_worker: sw } = manifest.background

        const { outputFileName } = generateFileNames(sw)

        const { dir } = parse(sw)
        if (isRollup || dir === '' || dir === '.') {
          manifest.background.service_worker = outputFileName
        } else {
          manifest.background.service_worker = swWrapperName
          this.emitFile({
            type: 'asset',
            fileName: swWrapperName,
            source: format`${swComment}
            import './${outputFileName}'`,
          })
        }

        manifest.background.type = 'module'
      }

      return manifest
    },
  }
}
