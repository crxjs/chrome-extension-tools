import {
  OutputBundle,
  PluginHooks,
  rollup,
  RollupBuild,
  RollupOutput,
} from 'rollup'
import { InversePromise, inversePromise } from './inversePromise'

export function buildCRX(
  configPath: string,
  cb: (
    error?: any,
    result?: {
      build: RollupBuild
      bundle: OutputBundle
      output: RollupOutput
    },
  ) => void,
) {
  const { default: config } = require(configPath)

  return async () => {
    try {
      const bundle: InversePromise<OutputBundle> = inversePromise()
      config.plugins.push({
        name: 'save-bundle-plugin',
        generateBundle(o, b) {
          return bundle.resolve(b)
        },
      } as Pick<PluginHooks, 'generateBundle'> & { name: string })

      const build = await rollup(config)
      const output = await build.generate(config.output)

      cb(undefined, { build, bundle: await bundle, output })
    } catch (error) {
      cb(error)
    }
  }
}
