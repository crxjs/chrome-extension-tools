import htmlInputs from './html-inputs/index'
import manifestInput from './manifest-input/index'

export default opts => {
  const manifest = manifestInput(opts)
  const html = htmlInputs(opts)
  const plugins = [manifest, html]

  return {
    name: 'chrome-extension',

    options(options) {
      return plugins.reduce(
        (o, p) => (p.options ? p.options.call(this, o) : o),
        options,
      )
    },

    buildStart(options) {
      manifest.buildStart.call(this, options)
      html.buildStart.call(this, options)
    },

    watchChange(id) {
      manifest.watchChange.call(this, id)
      html.watchChange.call(this, id)
    },

    transform(...args) {
      return manifest.transform.call(this, ...args)
    },

    renderChunk(...args) {
      return manifest.renderChunk.call(this, ...args)
    },

    async generateBundle(...args) {
      const hook = 'generateBundle'

      await Promise.all([
        manifest[hook].call(this, ...args),
        html[hook].call(this, ...args),
      ])
    },
  }
}
