import { deriveManifest, derivePermissions } from '@bumble/manifest'
import composePlugins from './compose'
import htmlInputs from './html-inputs'
import manifest from './manifest-input/index'

const transformManifest = pkg => (bundle, manifest) => {
  const permissions = Object.values(bundle).reduce((set, { code }) => {
    if (code) {
      derivePermissions(code).forEach(prm => {
        set.add(prm)
      })
    }

    return set
  })

  return deriveManifest(pkg, manifest, [...permissions])
}

const plugins = ({ pkg }) => [
  manifest({
    // manifest transform hook, called in writeBundle
    transform: transformManifest(pkg),
  }),
  htmlInputs(),
]

const name = 'chrome-extension'

export default composePlugins(name, plugins)
