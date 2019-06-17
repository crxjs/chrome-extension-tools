import bgClientCode from './client.code'
import ctClientCode from './ctClient.code'

const name = 'Persistent reloader'

const loadMessage = `
DEVELOPMENT build with persistent auto-reloader.
Loaded on ${new Date().toTimeString()}.
`.trim()

const timestampPath = 'assets/timestamp.js'

export function reloader() {
  const state = {}

  return {
    name,

    startReloader(options, bundle, setShouldStart) {
      setShouldStart(false)
    },

    createClientFiles(options, bundle) {
      const emit = (name, code) => {
        const id = this.emitAsset(name, code)

        return this.getAssetFileName(id)
      }

      const timestampFile = {
        fileName: timestampPath,
        isAsset: true,
        source: `export default ${Date.now()}`,
      }

      bundle[timestampPath] = timestampFile

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
    },

    updateManifest(options, bundle, _state = state) {
      const manifestKey = 'manifest.json'
      const manifestSource = bundle[manifestKey].source

      if (!manifestSource) {
        throw new ReferenceError(
          `bundle.${manifestKey} is undefined`,
        )
      }

      const manifest = JSON.parse(manifestSource)

      manifest.description = loadMessage

      if (!manifest.background) {
        manifest.background = {}
      }

      manifest.background.persistent = true

      const { scripts: bgScripts = [] } = manifest.background

      if (_state.bgScriptPath) {
        manifest.background.scripts = [
          _state.bgScriptPath,
          ...bgScripts,
        ]
      } else {
        throw new Error(
          'Background page reloader script was not emitted',
        )
      }

      const { content_scripts: ctScripts = [] } = manifest

      if (_state.ctScriptPath) {
        manifest.content_scripts = ctScripts.map(
          ({ js = [], ...rest }) => ({
            js: [_state.ctScriptPath, ...js],
            ...rest,
          }),
        )
      } else {
        throw new Error(
          'Content page reloader script was not emitted',
        )
      }

      bundle[manifestKey].source = JSON.stringify(
        manifest,
        undefined,
        2,
      )
    },

    async reloadClients() {
      // Reloader is active, so no need to do anything
    },
  }
}
