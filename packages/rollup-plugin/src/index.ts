import htmlInputs from './html-inputs'
import manifestInput from './manifest-input'
import { browserPolyfill as b } from './browser-polyfill'
import { validateNames as v } from './validate-names'
import { readJSONSync } from 'fs-extra'
import { join } from 'path'

import { ChromeExtensionOptions, ChromeExtensionPlugin } from './plugin-options'
import { mixedFormat as m } from './mixed-format'

export { simpleReloader } from './plugin-reloader-simple'

export type { ManifestV2, ManifestV3 } from './manifest-types'

export const chromeExtension = (
  options = {} as ChromeExtensionOptions,
): ChromeExtensionPlugin => {
  /* --------------- LOAD PACKAGE.JSON --------------- */

  try {
    const packageJsonPath = join(process.cwd(), 'package.json')
    options.pkg = options.pkg || readJSONSync(packageJsonPath)
    // eslint-disable-next-line no-empty
  } catch (error) {}

  /* ----------------- SETUP PLUGINS ----------------- */

  const manifest = manifestInput(options)
  const html = htmlInputs(manifest)
  const validate = v()
  const browser = b(manifest)
  const mixedFormat = m(manifest)

  /* ----------------- RETURN PLUGIN ----------------- */

  return {
    name: 'chrome-extension',

    // For testing
    _plugins: { manifest, html, validate },

    config: () => {
      console.warn(
        'Please run `npm i rollup-plugin-chrome-extension@beta` to use with Vite.',
      )
      throw new Error(
        '[chrome-extension] Vite support is for RPCE v4 and above. This is RPCE v3.6.7.',
      )
    },

    options(options) {
      try {
        return [manifest, html].reduce((opts, plugin) => {
          const result = plugin.options.call(this, opts)

          return result || options
        }, options)
      } catch (error) {
        const manifestError =
          'The manifest must have at least one script or HTML file.'
        const htmlError =
          'At least one HTML file must have at least one script.'

        if (
          error instanceof Error &&
          (error.message === manifestError || error.message === htmlError)
        ) {
          throw new Error(
            'A Chrome extension must have at least one script or HTML file.',
          )
        } else {
          throw error
        }
      }
    },

    async buildStart(options) {
      await Promise.all([
        manifest.buildStart.call(this, options),
        html.buildStart.call(this, options),
      ])
    },

    async resolveId(source, importer) {
      return manifest.resolveId.call(this, source, importer)
    },

    async load(id) {
      return manifest.load.call(this, id)
    },

    transform(source, id) {
      return manifest.transform.call(this, source, id)
    },

    watchChange(id) {
      manifest.watchChange.call(this, id)
      html.watchChange.call(this, id)
    },

    async generateBundle(...args) {
      await manifest.generateBundle.call(this, ...args)
      await validate.generateBundle.call(this, ...args)
      await browser.generateBundle.call(this, ...args)
      // TODO: should skip this if not needed
      await mixedFormat.generateBundle.call(this, ...args)
    },
  }
}
