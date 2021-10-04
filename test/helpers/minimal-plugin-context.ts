import { MinimalPluginContext } from 'rollup'
import { readPackageUpSync } from 'read-pkg-up'

const { packageJson } = readPackageUpSync() || {}

const rollupVersion =
  packageJson?.dependencies?.rollup || 'unknown'

export const context: MinimalPluginContext = {
  meta: { rollupVersion, watchMode: false },
}
