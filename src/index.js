import {
  deriveManifest,
  derivePermissions,
} from '@bumble/manifest'

import htmlInputs from './html-inputs/index'
import manifest from './manifest-input/index'
import emptyOutputDir from './empty-output-dir/index'
import zip from 'rollup-plugin-zip'

const release = (value = true) =>
  process.env.RELEASE === 'true' && value

const transformManifest = pkg => (bundle, manifest) => {
  const permissions = Object.values(bundle).reduce(
    (set, { code }) => {
      if (code) {
        derivePermissions(code).forEach(prm => {
          set.add(prm)
        })
      }

      return set
    },
    new Set(),
  )

  return deriveManifest(pkg, manifest, [...permissions])
}

export default ({ pkg, zipDir }) => [
  manifest({
    // manifest transform hook, called in writeBundle
    transform: transformManifest(pkg),
  }),
  htmlInputs(),
  emptyOutputDir(),
  release(zip({ dir: zipDir })),
]
