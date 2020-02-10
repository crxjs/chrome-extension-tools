import { code as bgClientCode } from 'code ./client/background.ts'
import { code as ctClientCode } from 'code ./client/content.ts'
import { code as serviceWorkerCode } from 'code ./sw/index.ts'
import { Plugin } from 'rollup'
import { updateManifest } from '../helpers'
import {
  buildStart,
  login,
  reload,
  update,
} from './fb-functions'

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
  // TODO: do not cache these values
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
): PushReloaderPlugin | undefined => {
  if (!process.env.ROLLUP_WATCH) {
    return undefined
  }

  return {
    name: 'chrome-extension-push-reloader',

    async buildStart() {
      await buildStart()
    },

    async generateBundle(options, bundle) {
      /* -------------- LOGIN ON FIRST BUILD ------------- */

      if (cache.firstRun) {
        // Login user
        cache.uid = await login()

        // Update last user access time
        await update()

        cache.interval = setInterval(() => {
          update()
        }, 5 * 60 * 1000)

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
            // eslint-disable-next-line quotes
            .replace(`%LOAD_MESSAGE%`, loadMessage),
        )

        cache.bgScriptPath = emit(
          'bg-reloader-wrapper.js',
          `import('/${cache.bgClientPath}')`,
        )

        cache.ctScriptPath = emit(
          'ct-reloader-client.js',
          // eslint-disable-next-line quotes
          ctClientCode.replace(`%LOAD_MESSAGE%`, loadMessage),
        )
      } else {
        this.error('Not signed into Firebase: no UID in cache')
      }

      /* ---------------- UPDATE MANIFEST ---------------- */

      updateManifest(
        (manifest) => {
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
              'Background page reloader script was not emitted.',
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
            this.warn(
              'Content page reloader script was not emitted.',
            )
          }

          const perms = new Set(permissions)
          perms.add('notifications')
          perms.add(
            'https://us-central1-rpce-reloader.cloudfunctions.net/registerToken',
          )

          manifest.permissions = Array.from(perms)

          return manifest
        },
        bundle,
        this.error,
      )
    },

    async writeBundle() {
      /* ----------------- RELOAD CLIENTS ---------------- */
      try {
        await reload()
      } catch (error) {
        if (error.message === 'no registered clients') {
          this.warn(
            'Reload the extension in Chrome to start hot-reloading.',
          )
        } else {
          this.error(error.message)
        }
      }
    },
  }
}
