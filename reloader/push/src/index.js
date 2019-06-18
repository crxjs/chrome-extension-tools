import { update, login, reload } from './config-index'

import bgClientCode from './client.code'
import ctClientCode from './ctClient.code'
import serviceWorkerCode from './sw.code'
import { loadMessage } from './loadMessage'

const name = 'Non-persistent reloader'

export const reloader = () => {
  const _state = {
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

      _state.uid = uid

      await update()

      _state.interval = setInterval(update, 5 * 60 * 1000)
    },

    createClientFiles(options, bundle, state = _state) {
      const emit = (name, code) => {
        const id = this.emitAsset(name, code)

        return this.getAssetFileName(id)
      }

      if (state.uid) {
        state.swPath = emit('reloader-sw.js', serviceWorkerCode)

        const bgClientPath = emit(
          'bg-reloader-client.js',
          bgClientCode
            .replace('%UID%', state.uid)
            .replace('%SW_PATH%', state.swPath),
        )

        state.bgScriptPath = emit(
          'bg-reloader-wrapper.js',
          `import('/${bgClientPath}')`,
        )

        state.ctScriptPath = emit(
          'ct-reloader-client.js',
          ctClientCode.replace('%LOAD_MESSAGE%', loadMessage),
        )
      } else {
        throw new TypeError('state.uid is undefined')
      }
    },

    updateManifest(options, bundle, state = _state) {
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

      if (manifest.background.persistent === undefined) {
        manifest.background.persistent = false
      }

      const { scripts: bgScripts = [] } = manifest.background

      if (state.bgScriptPath) {
        manifest.background.scripts = [
          state.bgScriptPath,
          ...bgScripts,
        ]
      } else {
        this.warn(
          'Background page reloader script was not emitted',
        )
      }

      const {
        content_scripts: ctScripts = [],
        permissions = [],
      } = manifest

      if (state.ctScriptPath) {
        manifest.content_scripts = ctScripts.map(
          ({ js = [], ...rest }) => ({
            js: [state.ctScriptPath, ...js],
            ...rest,
          }),
        )
      } else {
        this.warn('Content page reloader script was not emitted')
      }

      if (manifest.permissions) {
        const perms = new Set(permissions)
        perms.add('notifications')
        perms.add(
          'https://us-central1-rpce-reloader.cloudfunctions.net/registerToken',
        )

        manifest.permissions = Array.from(perms)
      }

      bundle[manifestKey].source = JSON.stringify(
        manifest,
        undefined,
        2,
      )
    },

    reloadClients() {
      return reload()
    },
  }
}
