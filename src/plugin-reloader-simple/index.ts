import { code as bgClientCode } from 'code ./client/background.ts'
import { code as ctClientCode } from 'code ./client/content.ts'
import { outputJson } from 'fs-extra'
import { set } from 'lodash'
import { join } from 'path'
import { OutputChunk, Plugin } from 'rollup'
import { updateManifest } from '../helpers'
import {
  backgroundPageReloader,
  contentScriptReloader,
  ctScriptPathPlaceholder,
  executeScriptPlaceholder,
  loadMessagePlaceholder,
  timestampFilename,
  timestampPathPlaceholder,
  unregisterServiceWorkersPlaceholder,
} from './CONSTANTS'

const delay = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms))

export type SimpleReloaderPlugin = Pick<
  Required<Plugin>,
  'name' | 'generateBundle' | 'writeBundle'
>

export interface SimpleReloaderOptions {
  executeScript?: boolean
  unregisterServiceWorkers?: boolean
  reloadDelay?: number
}

export interface SimpleReloaderCache {
  bgScriptPath?: string
  ctScriptPath?: string
  timestampPath?: string
  outputDir?: string
  loadMessage?: string
  manifestVersion?: 2 | 3
}

// Used for testing
export const _internalCache: SimpleReloaderCache = {}

export const simpleReloader = (
  {
    executeScript = true,
    unregisterServiceWorkers = true,
    reloadDelay = 100,
  } = {} as SimpleReloaderOptions,
  cache = {} as SimpleReloaderCache,
): SimpleReloaderPlugin | undefined => {
  if (!process.env.ROLLUP_WATCH) {
    return undefined
  }

  return {
    name: 'chrome-extension-simple-reloader',

    generateBundle({ dir }, bundle) {
      const date = new Date()
      const time = `${date
        .getFullYear()
        .toString()
        .padStart(2, '0')}-${(date.getMonth() + 1)
        .toString()
        .padStart(2, '0')}-${date
        .getDate()
        .toString()
        .padStart(2, '0')} ${date
        .getHours()
        .toString()
        .padStart(2, '0')}:${date
        .getMinutes()
        .toString()
        .padStart(2, '0')}:${date
        .getSeconds()
        .toString()
        .padStart(2, '0')}`

      cache.outputDir = dir
      cache.loadMessage = [
        'DEVELOPMENT build with simple auto-reloader',
        `[${time}] waiting for changes...`,
      ].join('\n')

      /* --------------- EMIT CLIENT FILES --------------- */

      const emit = (
        name: string,
        source: string,
        isFileName?: boolean,
      ) => {
        const id = this.emitFile({
          type: 'asset',
          [isFileName ? 'fileName' : 'name']: name,
          source,
        })

        return this.getFileName(id)
      }

      cache.timestampPath = emit(
        timestampFilename,
        JSON.stringify(Date.now()),
        true,
      )

      cache.ctScriptPath = emit(
        contentScriptReloader,
        ctClientCode.replace(
          loadMessagePlaceholder,
          JSON.stringify(cache.loadMessage),
        ),
      )

      cache.bgScriptPath = emit(
        backgroundPageReloader,
        bgClientCode
          .replace(timestampPathPlaceholder, cache.timestampPath)
          .replace(
            loadMessagePlaceholder,
            JSON.stringify(cache.loadMessage),
          )
          .replace(
            ctScriptPathPlaceholder,
            JSON.stringify(cache.ctScriptPath),
          )
          .replace(
            executeScriptPlaceholder,
            JSON.stringify(executeScript),
          )
          .replace(
            unregisterServiceWorkersPlaceholder,
            JSON.stringify(unregisterServiceWorkers),
          ),
      )

      // Update the exported cache
      Object.assign(_internalCache, cache)

      /* ---------------- UPDATE MANIFEST ---------------- */

      updateManifest(
        (manifest) => {
          /* ---------------- MANIFEST VERSION --------------- */

          cache.manifestVersion = manifest.manifest_version

          /* ------------------ DESCRIPTION ------------------ */

          manifest.description = cache.loadMessage

          /* ---------------- BACKGROUND PAGE ---------------- */

          if (!cache.bgScriptPath)
            this.error(
              `cache.bgScriptPath is ${typeof cache.bgScriptPath}`,
            )

          if (manifest.manifest_version === 3) {
            const swPath =
              manifest.background?.service_worker ??
              'service_worker.js'

            const swCode = `
              // SIMPLE RELOADER IMPORT
              import "./${cache.bgScriptPath}"
            `.trim()

            if (!bundle[swPath]) emit(swPath, swCode, true)
            else {
              const sw = bundle[swPath] as OutputChunk
              sw.code = `
              ${swCode}
              ${sw.code}
              `.trim()
            }

            set(manifest, 'background.service_worker', swPath)
            set(manifest, 'background.type', 'module')
          } else {
            set(
              manifest,
              'background.scripts',
              (manifest.background?.scripts ?? []).concat([
                cache.bgScriptPath,
              ]),
            )
            set(manifest, 'background.persistent', true)
          }

          /* ---------------- CONTENT SCRIPTS ---------------- */

          if (!cache.ctScriptPath)
            this.error(
              `cache.ctScriptPath is ${typeof cache.ctScriptPath}`,
            )

          const { content_scripts: ctScripts } = manifest

          manifest.content_scripts = ctScripts?.map(
            ({ js = [], ...rest }) => ({
              js: [cache.ctScriptPath!, ...js],
              ...rest,
            }),
          )

          return manifest
        },
        bundle,
        this.error,
      )

      // We'll write this file ourselves, we just need a safe path to write the timestamp
      delete bundle[cache.timestampPath]
    },

    /* -------------- WRITE TIMESTAMP FILE ------------- */
    async writeBundle() {
      // Sometimes Chrome says the manifest isn't valid, so we need to wait a bit
      reloadDelay > 0 && (await delay(reloadDelay))

      try {
        await outputJson(
          join(cache.outputDir!, cache.timestampPath!),
          Date.now(),
        )
      } catch (err) {
        if (isErrorLike(err)) {
          this.error(
            `Unable to update timestamp file:\n\t${err.message}`,
          )
        } else {
          this.error('Unable to update timestamp file')
        }
      }
    },
  }
}

interface ErrorLike {
  message: string
}
function isErrorLike(x: unknown): x is ErrorLike {
  return typeof x === 'object' && x !== null && 'message' in x
}
