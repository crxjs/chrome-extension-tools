import { code as bgCode } from 'code ./browser/code-simpleReloader-bgCode.ts'
import { code as csCode } from 'code ./browser/code-simpleReloader-csCode.ts'
import MagicString from 'magic-string'
import { isMV2, CrxPlugin } from './types'
import { devWarning } from './browser/simpleReloader_helpers'
import { parse } from './path'

const csFilename = 'simple-reloader--content-script.js'
const bgFilename = 'simple-reloader--background.js'

export const simpleReloader = (): CrxPlugin => {
  let swFilename: string | undefined

  return {
    name: 'simple-reloader',
    transformCrxManifest(manifest) {
      if (!this.meta.watchMode) return null

      manifest.description = devWarning

      manifest.content_scripts = manifest.content_scripts?.map(
        ({ js = [], ...rest }) => ({
          js: [csFilename, ...js],
          ...rest,
        }),
      )

      if (isMV2(manifest)) {
        manifest.background = manifest.background ?? {
          persistent: false,
        }
        manifest.background.scripts = [
          bgFilename,
          ...(manifest.background?.scripts ?? []),
        ]
      } else if (!manifest.background) {
        manifest.background = { service_worker: bgFilename }
      } else {
        swFilename = manifest.background.service_worker
      }

      return manifest
    },
    renderCrxManifest(manifest) {
      if (!this.meta.watchMode) return null

      manifest.version_name = new Date().toISOString()

      return manifest
    },
    resolveId(source) {
      if (!this.meta.watchMode) return null

      if (source.includes(bgFilename)) return source
      if (source.includes(csFilename)) return source

      return null
    },
    load(id) {
      if (!this.meta.watchMode) return null

      if (id.includes(bgFilename)) return bgCode
      if (id.includes(csFilename)) return csCode

      return null
    },
    transform(code, id) {
      if (!this.meta.watchMode) return null

      if (parse(id).base === swFilename) {
        const s = new MagicString(code)

        s.prepend(`import "${bgFilename}";\n`)

        return {
          code: s.toString(),
          map: s.generateMap().toString(),
        }
      }

      return null
    },
  }
}
