import { readJSONSync } from 'fs-extra'
import { join } from 'path'
import { InputOptions } from 'rollup'
import { browserPolyfill as b } from './browser-polyfill'
import htmlInputs from './html-inputs'
import manifestInput from './manifest-input'
import { mixedFormat as m } from './mixed-format'
import {
  ChromeExtensionOptions,
  ChromeExtensionPlugin,
} from './plugin-options'
import {
  sendConfigureServer,
  shimPluginContext,
} from './viteAdaptor'
import { validateNames as v } from './validate-names'

export type { ManifestV2, ManifestV3 } from './manifest-types'
export { simpleReloader } from './plugin-reloader-simple'

export const chromeExtension = (
  options = {} as ChromeExtensionOptions,
): ChromeExtensionPlugin => {
  /* --------------- LOAD PACKAGE.JSON --------------- */

  try {
    const packageJsonPath = join(process.cwd(), 'package.json')
    options.pkg = options.pkg || readJSONSync(packageJsonPath)
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

    options(options) {
      try {
        return [manifest, html].reduce((opts, plugin) => {
          const result = plugin.options.call(
            this,
            opts,
          ) as InputOptions

          return result || options
        }, options)
      } catch (error) {
        const manifestError =
          'The manifest must have at least one script or HTML file.'
        const htmlError =
          'At least one HTML file must have at least one script.'

        if (
          error.message === manifestError ||
          error.message === htmlError
        ) {
          throw new Error(
            'A Chrome extension must have at least one script or HTML file.',
          )
        } else {
          throw error
        }
      }
    },

    configureServer(server) {
      sendConfigureServer(server)
    },

    async buildStart(options) {
      const context = shimPluginContext(this, 'buildStart')

      await Promise.all([
        manifest.buildStart.call(context, options),
        html.buildStart.call(context, options),
      ])
    },

    async resolveId(source, importer, options) {
      const context = shimPluginContext(this, 'resolveId')

      return manifest.resolveId.call(
        context,
        source,
        importer,
        options,
      )
    },

    async load(id) {
      const context = shimPluginContext(this, 'load')

      return manifest.load.call(context, id)
    },

    watchChange(id, change) {
      manifest.watchChange.call(this, id, change)
      html.watchChange.call(this, id, change)
    },

    async generateBundle(...args) {
      await manifest.generateBundle.call(this, ...args)
      await validate.generateBundle.call(this, ...args)
      await browser.generateBundle.call(this, ...args)
      await mixedFormat.generateBundle.call(this, ...args)
    },
  }
}
