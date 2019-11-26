import { Plugin, EmittedAsset, OutputAsset } from 'rollup'
import { code as bgClientCode } from 'code ./client/background.ts'
import { code as ctClientCode } from 'code ./client/content.ts'

export type SimpleReloader = Pick<
  Required<Plugin>,
  'name' | 'generateBundle'
>

export interface SimpleReloaderCache {
  bgScriptPath?: string
  ctScriptPath?: string
}

const loadMessage: string = `
DEVELOPMENT build with simple auto-reloader.
Loaded on ${new Date().toTimeString()}.
`.trim()

const timestampPath = 'assets/timestamp.js'

export const simpleReloader = (): SimpleReloader => {
  const state: SimpleReloaderCache = {}

  return {
    name: 'simple-reloader',

    async generateBundle(options, bundle) {
      /* ----------------- Start Reloader -------------------------- */

      /* ----------------- Create Client Files -------------------------- */
      const emit = (name: string, code: string) => {
        const id = this.emitAsset(name, code)

        return this.getAssetFileName(id)
      }

      const timestampFile: EmittedAsset = {
        fileName: timestampPath,
        type: 'asset',
        source: `export default ${Date.now()}`,
      }

      this.emitFile(timestampFile)

      state.bgScriptPath = emit(
        'bg-reloader-client.js',
        bgClientCode
          .replace('%TIMESTAMP_PATH%', timestampPath)
          .replace('%LOAD_MESSAGE%', loadMessage),
      )

      state.ctScriptPath = emit(
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

      if (state.bgScriptPath) {
        manifest.background.scripts = [
          state.bgScriptPath,
          ...bgScripts,
        ]
      } else {
        throw new Error(
          'Background page reloader script was not emitted',
        )
      }

      const { content_scripts: ctScripts = [] } = manifest

      if (state.ctScriptPath) {
        manifest.content_scripts = ctScripts.map(
          ({ js = [], ...rest }) => ({
            js: [state.ctScriptPath!, ...js],
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
