import { Plugin, EmittedAsset, OutputAsset } from 'rollup'
import { code as bgClientCode } from 'code ./client/background.ts'
import { code as ctClientCode } from 'code ./client/content.ts'

export type SimpleReloaderPlugin = Pick<
  Required<Plugin>,
  'name' | 'generateBundle'
>

export interface SimpleReloaderCache {
  bgScriptPath?: string
  ctScriptPath?: string
}

export const loadMessage: string = `
DEVELOPMENT build with simple auto-reloader.
Loaded on ${new Date().toTimeString()}.
`.trim()

const timestampPath = 'assets/timestamp.js'

export const simpleReloader = (
  cache = {} as SimpleReloaderCache,
): SimpleReloaderPlugin => {
  return {
    name: 'simple-reloader',

    async generateBundle(options, bundle) {
      /* ----------------- Start Reloader -------------------------- */

      /* ----------------- Create Client Files -------------------------- */
      const emit = (name: string, source: string) => {
        const id = this.emitFile({
          type: 'asset',
          name,
          source,
        })

        return this.getFileName(id)
      }

      const timestampFile: EmittedAsset = {
        fileName: timestampPath,
        type: 'asset',
        source: `export default ${Date.now()}`,
      }

      this.emitFile(timestampFile)

      cache.bgScriptPath = emit(
        'bg-reloader-client.js',
        bgClientCode
          .replace('%TIMESTAMP_PATH%', timestampPath)
          .replace('%LOAD_MESSAGE%', loadMessage),
      )

      cache.ctScriptPath = emit(
        'ct-reloader-client.js',
        ctClientCode.replace('%LOAD_MESSAGE%', loadMessage),
      )

      /* ----------------- Update Manifest -------------------------- */

      const manifestKey = 'manifest.json'
      const manifestObj = bundle[manifestKey] as OutputAsset
      const manifestSource = manifestObj.source as string

      if (!manifestSource) {
        throw new ReferenceError(
          `bundle.${manifestKey} is undefined`,
        )
      }

      const manifest: ChromeExtensionManifest = JSON.parse(
        manifestSource,
      )

      manifest.description = loadMessage

      if (!manifest.background) {
        manifest.background = {}
      }

      manifest.background.persistent = true

      const { scripts: bgScripts = [] } = manifest.background

      if (cache.bgScriptPath) {
        manifest.background.scripts = [
          cache.bgScriptPath,
          ...bgScripts,
        ]
      } else {
        throw new Error(
          'Background page reloader script was not emitted',
        )
      }

      const { content_scripts: ctScripts = [] } = manifest

      if (cache.ctScriptPath) {
        manifest.content_scripts = ctScripts.map(
          ({ js = [], ...rest }) => ({
            js: [cache.ctScriptPath!, ...js],
            ...rest,
          }),
        )
      } else {
        throw new Error(
          'Content page reloader script was not emitted',
        )
      }

      manifestObj.source = JSON.stringify(manifest, undefined, 2)
    },
  }
}
