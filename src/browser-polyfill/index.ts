import fs from 'fs-extra'
import { Plugin } from 'rollup'
import { isAsset } from '../helpers'
import { code as executeScriptPolyfill } from 'code ./browser/executeScriptPolyfill.ts'
import { ChromeExtensionManifest } from '../manifest'
import {
  ChromeExtensionPlugin,
  ManifestInputPlugin,
} from '../plugin-options'

const defaultOptions = { executeScript: true }
export function browserPolyfill({
  browserPolyfill: options = defaultOptions,
}: Pick<ManifestInputPlugin, 'browserPolyfill'>): Pick<
  Required<Plugin>,
  'name' | 'generateBundle'
> {
  if (options === false)
    return {
      name: 'no-op',
      generateBundle() {},
    }
  else if (options === true) options = defaultOptions
  const { executeScript = true } = options

  const convert = require('convert-source-map')
  const polyfillPath = require.resolve('webextension-polyfill')
  const src = fs.readFileSync(polyfillPath, 'utf-8')
  const map = fs.readJsonSync(polyfillPath + '.map')

  const browserPolyfillSrc = [
    convert.removeMapFileComments(src),
    convert.fromObject(map).toComment(),
  ].join('\n')

  return {
    name: 'browser-polyfill',
    generateBundle({ plugins = [] }, bundle) {
      const firefoxPlugin = plugins.find(
        ({ name }) => name === 'firefox-addon',
      )
      const chromeExtensionPlugin = plugins.find(
        ({ name }) => name === 'chrome-extension',
      ) as ChromeExtensionPlugin

      if (
        firefoxPlugin &&
        !chromeExtensionPlugin._plugins.manifest.crossBrowser
      ) {
        return // Don't need to add it
      }

      const manifestAsset = bundle['manifest.json']
      if (!isAsset(manifestAsset)) {
        throw new TypeError(
          `manifest.json must be an OutputAsset, received "${typeof manifestAsset}"`,
        )
      }
      const manifest = JSON.parse(
        manifestAsset.source as string,
      ) as ChromeExtensionManifest

      /* ------------- EMIT BROWSER POLYFILL ------------- */

      const bpId = this.emitFile({
        type: 'asset',
        source: browserPolyfillSrc,
        fileName: 'assets/browser-polyfill.js',
      })

      const browserPolyfillPath = this.getFileName(bpId)

      if (executeScript) {
        const exId = this.emitFile({
          type: 'asset',
          source: executeScriptPolyfill.replace(
            '%BROWSER_POLYFILL_PATH%',
            JSON.stringify(browserPolyfillPath),
          ),
          fileName: 'assets/browser-polyfill-executeScript.js',
        })

        const executeScriptPolyfillPath = this.getFileName(exId)

        manifest.background?.scripts?.unshift(
          executeScriptPolyfillPath,
        )
      }

      manifest.background?.scripts?.unshift(browserPolyfillPath)
      manifest.content_scripts?.forEach((script) => {
        script.js?.unshift(browserPolyfillPath)
      })

      /* ---------------- UPDATE MANIFEST ---------------- */
      manifestAsset.source = JSON.stringify(manifest)
    },
  }
}
