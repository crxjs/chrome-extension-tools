import { MinimalPluginContext } from 'rollup'
import readPkgUp from 'read-pkg-up'

const { packageJson } = readPkgUp.sync() || {}

const rollupVersion =
  packageJson?.dependencies?.rollup || 'unknown'

export const context: MinimalPluginContext = {
  meta: { rollupVersion, watchMode: false },
}
