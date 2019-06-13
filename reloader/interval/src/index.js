import clientCode from './client.code'

const name = 'Persistent reloader'

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

      const timestampPath = 'assets/timestamp.js'

      const timestampFile = {
        fileName: timestampPath,
        isAsset: true,
        source: `export default ${Date.now()}`,
      }

      bundle[timestampPath] = timestampFile

      state.scriptPath = emit(
        'reloader-client.js',
        clientCode.replace('%TIMESTAMP_PATH%', timestampPath),
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

      if (!manifest.background) {
        manifest.background = {}
      }

      const { scripts = [] } = manifest.background

      // const { web_accessible_resources = [] } = manifest

      if (_state.scriptPath) {
        manifest.background.scripts = [
          _state.scriptPath,
          ...scripts,
        ]

        // manifest.web_accessible_resources = [
        //   ...web_accessible_resources,
        //   _state.scriptPath,
        // ]
      } else {
        throw new TypeError('state.scriptPath is undefined')
      }

      manifest.background.persistent = true

      manifest.description = `DEVELOPMENT BUILD with ${name} script.`

      bundle[manifestKey].source = JSON.stringify(manifest)
    },

    async reloadClients() {
      // Reloader is active, so no need to do anything
    },
  }
}
