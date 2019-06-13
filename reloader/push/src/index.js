import { update, login, reload } from './config-index'

import clientCode from './client.code'
import serviceWorkerCode from './sw.code'

const name = 'Non-persistent reloader'

export const reloader = () => {
  const state = {
    // Anonymous UID from Firebase
    // uid: string,
    // Interval ID for updateUid
    // interval: number,
    // Path to service worker
    // swPath: string,
  }

  return {
    name,

    async startReloader(options, bundle, cb) {
      const uid = await login(cb)

      state.uid = uid

      state.interval = setInterval(update, 5 * 60 * 1000)

      return update()
    },

    createClientFiles(options, bundle, _state = state) {
      const emit = (name, code) => {
        const id = this.emitAsset(name, code)

        return this.getAssetFileName(id)
      }

      if (_state.uid) {
        _state.swPath = emit('reloader-sw.js', serviceWorkerCode)

        const clientPath = emit(
          'reloader-client.js',
          clientCode
            .replace('%UID%', _state.uid)
            .replace('%SW_PATH%', _state.swPath),
        )

        _state.scriptPath = emit(
          'reloader-wrapper.js',
          `import('/${clientPath}')`,
        )
      } else {
        throw new TypeError('state.uid is undefined')
      }
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

      const {
        web_accessible_resources = [],
        permissions = [],
      } = manifest

      if (_state.scriptPath) {
        manifest.background.scripts = [
          _state.scriptPath,
          ...scripts,
        ]

        manifest.web_accessible_resources = [
          ...web_accessible_resources,
          _state.scriptPath,
        ]
      } else {
        throw new TypeError('state.scriptPath is undefined')
      }

      if (manifest.background.persistent === undefined) {
        manifest.background.persistent = false
      }

      if (manifest.permissions) {
        const perms = new Set(permissions)
        perms.add('notifications')
        perms.add(
          'https://us-central1-rpce-reloader.cloudfunctions.net/registerToken',
        )

        manifest.permissions = Array.from(perms)
      }

      manifest.description =
        'DEVELOPMENT BUILD with auto-reloader script.'

      bundle[manifestKey].source = JSON.stringify(manifest)
    },

    reloadClients() {
      return reload()
    },
  }
}
