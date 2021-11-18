import { startCase } from 'lodash'
import { readPackageUpAsync as readPkgUp } from 'read-pkg-up'
import { PackageJson } from 'type-fest'
import { CrxPlugin } from './types'

/** Applies name, version, and description from package.json to the manifest */
export const packageJson = (): CrxPlugin => {
  let packageJson: PackageJson | undefined
  return {
    name: 'package-json',
    crx: true,
    api: {
      get packageJson() {
        return packageJson
      },
    },
    async options() {
      const result = await readPkgUp()
      packageJson =
        result?.packageJson ??
        (process.env.npm_package_name &&
        process.env.npm_package_version &&
        process.env.npm_package_description
          ? {
              name: process.env.npm_package_name,
              version: process.env.npm_package_version,
              description: process.env.npm_package_description,
            }
          : {
              name: '',
              version: '',
              description: '',
            })

      return undefined
    },
    transformCrxManifest(manifest) {
      manifest.manifest_version = manifest.manifest_version ?? 2
      manifest.name =
        manifest.name ?? startCase(packageJson?.name)
      manifest.version = manifest.version ?? packageJson?.version
      manifest.description =
        manifest.description ?? packageJson?.description
      return manifest
    },
  }
}
