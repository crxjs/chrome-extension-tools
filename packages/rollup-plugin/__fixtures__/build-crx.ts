import {
  OutputBundle,
  PluginHooks,
  rollup,
  RollupBuild,
  RollupOutput,
} from 'rollup'
import { getExtPath } from './utils'

type RollupBuildData = {
  build: RollupBuild
  bundle: OutputBundle
  output: RollupOutput
}

export function buildCRX(
  crxPath = 'mv2-kitchen-sink/rollup.config.js',
): ReturnType<typeof innerBuildCRX> {
  return new Promise((resolve, reject) => {
    beforeAll(async () => {
      try {
        const buildPromise = await innerBuildCRX(crxPath)

        resolve(buildPromise)
      } catch (error) {
        reject(error)
      }
    }, 30000)
  })
}

/** Builds the kitchen-sink example crx by default */
export async function innerBuildCRX(
  crxPath: string,
): Promise<RollupBuildData> {
  const extPath = getExtPath(crxPath)
  const config = require(extPath).default

  if (typeof config.output === 'undefined')
    throw new TypeError('Rollup config must have output')

  const bundlePromise: Promise<OutputBundle> = new Promise(
    (resolve) => {
      config.plugins = config.plugins || []
      config.plugins.push({
        name: 'save-bundle-plugin',
        generateBundle(o, b) {
          resolve(b)
        },
      } as Pick<PluginHooks, 'generateBundle'> & { name: string })
    },
  )

  const build = await rollup(config)
  const output = await build.generate(
    Array.isArray(config.output)
      ? config.output[0]
      : config.output,
  )

  return { build, bundle: await bundlePromise, output }
}
