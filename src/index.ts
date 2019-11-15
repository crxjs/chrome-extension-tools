import { PluginHooks } from 'rollup'
import htmlInputs from './html-inputs/index'
import manifestInput from './manifest-input/index'
import useReloader from './reloader'
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

export const chromeExtension = (
  options = {} as ChromeExtensionOptions,
): Pick<
  PluginHooks,
  | 'options'
  | 'buildStart'
  | 'watchChange'
  | 'generateBundle'
  | 'writeBundle'
> & {
  name: string
  _plugins: Record<
    string,
    Partial<PluginHooks> & { name: string; srcDir?: string }
  >
} => {
  const manifest = manifestInput(options)
  const html = htmlInputs(manifest)
  const reloader = useReloader(options)
  const validate = v()

  return {
    name: 'chrome-extension',
    _plugins: { manifest, html, reloader, validate },

    options(options) {
      return [manifest, html].reduce((opts, plugin) => {
        const result = plugin.options.call(this, opts)

        return result || options
      }, options)
    },

    buildStart(options) {
      const hook = 'buildStart'

      // @ts-ignore
      manifest[hook].call(this, options)
      // @ts-ignore
      html[hook].call(this, options)
    },

    watchChange(id) {
      const hook = 'watchChange'

      // @ts-ignore
      manifest[hook].call(this, id)
      // @ts-ignore
      html[hook].call(this, id)
    },

    async generateBundle(...args) {
      const hook = 'generateBundle'

      // @ts-ignore
      await manifest[hook].call(this, ...args)
      // @ts-ignore
      await reloader[hook].call(this, ...args)
      // @ts-ignore
      await validate[hook].call(this, ...args)
    },

    async writeBundle(...args) {
      const hook = 'writeBundle'

      // @ts-ignore
      await reloader[hook].call(this, ...args)
    },
  }
}
