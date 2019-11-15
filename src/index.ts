import htmlInputs from './html-inputs/index'
import manifestInput from './manifest-input/index'
import useReloader from './reloader'
import { validate as v } from './validate-names/index'
import { PluginHooks } from 'rollup'

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
): Partial<PluginHooks> & {
  name: string
} => {
  const manifest = manifestInput(options)
  const html = htmlInputs(manifest)
  const reloader = useReloader(options)
  const validate = v()
  const plugins = [manifest, html, reloader, validate]

  return {
    name: 'chrome-extension',

    options(options) {
      const hook = 'options'

      return plugins.reduce(
        (opts, plugin) =>
          // @ts-ignore
          plugin[hook] ? plugin[hook].call(this, opts) : opts,
        options,
      )
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
