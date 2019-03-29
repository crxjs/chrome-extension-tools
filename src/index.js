import {
  deriveManifest,
  derivePermissions,
} from '@bumble/manifest'

import htmlInputs from './html-inputs/index'
import manifest from './manifest-input/index'
import emptyOutputDir from './empty-output-dir/index'
import zip from 'rollup-plugin-zip'
import asyncIIFE from './async-iife/index'

const release = (value = true) =>
  process.env.RELEASE === 'true' && value

const transformManifest = pkg => (bundle, manifest) => {
  if (Object.values(pkg).some(x => !x)) {
    throw 'chrome-extension: Failed to derive manifest, options.pkg is not fully defined. Please run through npm scripts.'
  }

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

const npmPkgDetails = {
  name: process.env.npm_package_name,
  version: process.env.npm_package_version,
  description: process.env.npm_package_description,
  author: process.env.npm_package_author,
}

export default ({
  pkg = npmPkgDetails,
  zipDir = 'releases',
} = {}) => [
  manifest({
    // manifest transform hook, called in writeBundle
    transform: transformManifest(pkg),
  }),
  htmlInputs(),
  asyncIIFE(),
  release(zip({ dir: zipDir })),
  emptyOutputDir(),
]
