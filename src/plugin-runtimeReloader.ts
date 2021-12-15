import { code as bgCode } from 'code ./browser/code-runtimeReloader-bgCode.ts'
import { code as csCode } from 'code ./browser/code-runtimeReloader-csCode.ts'
import MagicString from 'magic-string'
import { isMV2, CrxPlugin, isMV3 } from './types'
import {
  applyDevWarning,
  createDevWarning,
} from './browser/runtimeReloader_helpers'
import { parse } from './path'

export const runtimeReloaderCS =
  'runtime-reloader--content-script.js'
export const runtimeReloaderBG =
  'runtime-reloader--background.js'

export const runtimeReloader = (): CrxPlugin => {
  let swFilename: string | undefined

  return {
    name: 'runtime-reloader',
    crx: true,
    transformCrxManifest(manifest) {
      if (!this.meta.watchMode) return null

      if (isMV3(manifest)) {
        swFilename = manifest.background?.service_worker
      }

      return manifest
    },
    renderCrxManifest(manifest) {
      if (!this.meta.watchMode) return null

      manifest.description = createDevWarning()
      manifest.version_name = new Date().toISOString()

      if (isMV2(manifest)) {
        manifest.background = manifest.background ?? {}
        manifest.background.scripts = [
          runtimeReloaderBG,
          ...(manifest.background?.scripts ?? []),
        ]

        this.emitFile({
          type: 'asset',
          fileName: runtimeReloaderBG,
          source: applyDevWarning(bgCode),
        })
      } else if (!manifest.background) {
        manifest.background = {
          service_worker: runtimeReloaderBG,
          type: 'module',
        }

        this.emitFile({
          type: 'asset',
          fileName: runtimeReloaderBG,
          source: applyDevWarning(bgCode),
        })
      }

      const scripts = manifest.content_scripts ?? []
      if (scripts.length) {
        manifest.content_scripts = manifest.content_scripts?.map(
          ({ js = [], ...rest }) => ({
            js: [runtimeReloaderCS, ...js],
            ...rest,
          }),
        )
      } else {
        manifest.content_scripts = [
          {
            matches: ['http://*/*', 'https://*/*'],
            js: [runtimeReloaderCS],
          },
        ]
      }
      this.emitFile({
        type: 'asset',
        fileName: runtimeReloaderCS,
        source: applyDevWarning(csCode),
      })

      return manifest
    },
    resolveId(source) {
      if (!this.meta.watchMode) return null
      if (source.includes(runtimeReloaderBG))
        return runtimeReloaderBG
      return null
    },
    load(id) {
      if (!this.meta.watchMode) return null
      if (id === runtimeReloaderBG) {
        return applyDevWarning(bgCode)
      }

      return null
    },
    transform(code, id) {
      if (!this.meta.watchMode) return null

      if (parse(id).base === swFilename) {
        const s = new MagicString(code)

        s.prepend(`import "${runtimeReloaderBG}";\n`)

        return {
          code: s.toString(),
          map: s.generateMap().toString(),
        }
      }

      return null
    },
  }
}
