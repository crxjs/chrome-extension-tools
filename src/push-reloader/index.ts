import { Plugin, OutputAsset } from 'rollup'

import { update, login, reload } from './fb-functions'

import { code as bgClientCode } from 'code ./client/background.ts'
import { code as ctClientCode } from 'code ./client/content.ts'
import { code as serviceWorkerCode } from 'code ./sw/index.ts'

export const loadMessage = `
DEVELOPMENT build with non-persistent auto-reloader.
Loaded on ${new Date().toTimeString()}.
`.trim()

export type PushReloaderPlugin = Pick<
  Required<Plugin>,
  'name' | 'buildStart' | 'generateBundle' | 'writeBundle'
>

export interface PushReloaderCache {
  // Anonymous UID from Firebase
  uid?: string
  // Interval ID for updateUid
  interval?: NodeJS.Timeout
  // Path to service worker
  swPath?: string
  firstRun: boolean
  bgClientPath?: string
  bgScriptPath?: string
  ctScriptPath?: string
}

export const pushReloader = (
  {
    cache = {
      firstRun: true,
    },
  } = {} as {
    cache: PushReloaderCache
  },
): PushReloaderPlugin => {
  return {
    name: 'push-reloader',

    async buildStart() {
      /* ----- SIGNAL CLIENTS THAT BUILD HAS STARTED ----- */
    },

    async generateBundle(options, bundle, isWrite) {
      /* -------------- LOGIN ON FIRST BUILD ------------- */

      if (cache.firstRun) {
        // Login user
        cache.uid = await login()

        // Update last user access time
        await update()

        cache.interval = setInterval(update, 5 * 60 * 1000)

        cache.firstRun = false
      }

      /* ------- CREATE CLIENT FILES ON EACH BUILD ------- */

      const emit = (name: string, source: string) => {
        const id = this.emitFile({ type: 'asset', name, source })

        return this.getFileName(id)
      }

      if (cache.uid) {
        cache.swPath = emit('reloader-sw.js', serviceWorkerCode)

        cache.bgClientPath = emit(
          'bg-reloader-client.js',
          bgClientCode
            .replace('%UID%', cache.uid)
            .replace('%SW_PATH%', cache.swPath)
            .replace('%LOAD_MESSAGE%', loadMessage),
        )

        cache.bgScriptPath = emit(
          'bg-reloader-wrapper.js',
          `import('/${cache.bgClientPath}')`,
        )

        cache.ctScriptPath = emit(
          'ct-reloader-client.js',
          ctClientCode.replace('%LOAD_MESSAGE%', loadMessage),
        )
      } else {
        throw new TypeError(
          'Not signed into Firebase: no UID in cache',
        )
      }

      /* ---------------- UPDATE MANIFEST ---------------- */

      const manifestKey = 'manifest.json'
      const manifestAsset = bundle[manifestKey] as OutputAsset
      const manifestSource = manifestAsset.source as string

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

      if (manifest.background.persistent === undefined) {
        manifest.background.persistent = false
      }

      const { scripts: bgScripts = [] } = manifest.background

      if (cache.bgScriptPath) {
        manifest.background.scripts = [
          cache.bgScriptPath,
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

      if (cache.ctScriptPath) {
        manifest.content_scripts = ctScripts.map(
          ({ js = [], ...rest }) => ({
            js: [cache.ctScriptPath!, ...js],
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

      manifestAsset.source = JSON.stringify(
        manifest,
        undefined,
        2,
      )
    },

    async writeBundle() {
      /* ----------------- RELOAD CLIENTS ---------------- */
      await reload()
    },
  }
}
