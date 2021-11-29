import { ChromeExtensionOptions, CrxPlugin } from './types'

/**
 * Implements plugin option `options.extendManifest`
 */
export const extendManifest = ({
  extendManifest,
}: ChromeExtensionOptions): CrxPlugin => ({
  name: 'extend-manifest',
  crx: true,
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
