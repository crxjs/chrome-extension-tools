import { PluginHooks } from 'rollup'
import htmlInputs from './html-inputs/index'
import manifestInput from './manifest-input/index'
import { validate as v } from './validate-names/index'

export interface ChromeExtensionOptions {
  assets?: {
    include?: string[]
    exclude?: string[]
  }
  dynamicImportWrapper?: {
    wakeEvents?: string[]
    eventDelay?: number | false
  }
  entries?: {
    include?: string[]
    exclude?: string[]
  }
  verbose?: boolean
  pkg?: {
    description: string
    name: string
    version: string
  }
  publicKey?: string
  reloader?: 'non-persistent' | 'persistent'
}

// export const pushReloader = (): Pick<
//   PluginHooks,
//   'buildStart' | 'generateBundle' | 'writeBundle'
// > & { name: string } => ({
//   name: 'push-reloader',
//   buildStart() {},
//   generateBundle() {},
//   writeBundle() {},
// })

// export const intervalReloader = (): Pick<
//   PluginHooks,
//   'generateBundle' | 'writeBundle'
// > & { name: string } => ({
//   name: 'interval-reloader',
//   generateBundle() {},
//   writeBundle() {},
// })

export const chromeExtension = (
  options = {} as ChromeExtensionOptions,
): Pick<
  PluginHooks,
  'options' | 'buildStart' | 'watchChange' | 'generateBundle'
> & {
  name: string
  _plugins: Record<
    string,
    Partial<PluginHooks> & {
      name: string
      srcDir?: string | null
    }
  >
} => {
  const manifest = manifestInput(options)
  const html = htmlInputs(manifest)
  const validate = v()

  return {
    name: 'chrome-extension',

    // For testing
    _plugins: { manifest, html, validate },

    options(options) {
      return [manifest, html].reduce((opts, plugin) => {
        const result = plugin.options.call(this, opts)

        return result || options
      }, options)
    },

    async buildStart(options) {
      await Promise.all([
        manifest.buildStart.call(this, options),
        html.buildStart.call(this, options),
      ])
    },

    watchChange(id) {
      manifest.watchChange.call(this, id)
      html.watchChange.call(this, id)
    },

    async generateBundle(...args) {
      await manifest.generateBundle.call(this, ...args)
      // TODO: run validate-names in writeBundle
      await validate.generateBundle.call(this, ...args)
    },
  }
}
