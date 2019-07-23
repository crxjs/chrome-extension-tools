import htmlInputs from './html-inputs/index'
import manifestInput from './manifest-input/index'
import useReloader from './reloader'

export default (opts) => {
  const manifest = manifestInput(opts)
  const html = htmlInputs(opts)
  const reloader = useReloader(opts)
  const plugins = [manifest, html, reloader]

  return {
    name: 'chrome-extension',

    options(options) {
      const hook = 'options'

      return plugins.reduce(
        (opts, plugin) =>
          plugin[hook] ? plugin[hook].call(this, opts) : opts,
        options,
      )
    },

    buildStart(options) {
      const hook = 'buildStart'

      manifest[hook].call(this, options)
      html[hook].call(this, options)
    },

    watchChange(id) {
      const hook = 'watchChange'

      manifest[hook].call(this, id)
      html[hook].call(this, id)
    },

    async generateBundle(...args) {
      const hook = 'generateBundle'

      await manifest[hook].call(this, ...args)
      await html[hook].call(this, ...args)
      await reloader[hook].call(this, ...args)
    },

    async writeBundle(...args) {
      const hook = 'writeBundle'

      await reloader[hook].call(this, ...args)
    },
  }
}
