import { MinimalPluginContext } from 'rollup'
import pkg from '../package.json'

const rollupVersion = pkg.devDependencies.rollup

export const context: MinimalPluginContext = {
  meta: { rollupVersion },
}
