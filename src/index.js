import manifest from './manifest-input/index'
import html from './html-input/index'
import composePlugins from './compose'

const name = 'chrome-extension'

const plugins = () => [
  manifest({
    // manifest transfrom hook, called in writeBundle
    transform(bundle, manifest) {
      return manifest
    },
  }),
  html(),
]

export default composePlugins(name, plugins)
