import { ChromeExtensionOptions, RPCEPlugin } from './types'

export const extendManifest = ({
  extendManifest,
}: ChromeExtensionOptions): RPCEPlugin => ({
  name: 'extend-manifest',
  transformCrxManifest(manifest) {
    let newManifest = manifest
    if (typeof extendManifest === 'function') {
      newManifest = extendManifest(manifest)
    } else if (typeof extendManifest === 'object') {
      newManifest = Object.assign(manifest, extendManifest)
    }

    return newManifest
  },
})
