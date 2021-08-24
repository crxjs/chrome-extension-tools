/* eslint-env jest */

import path from 'path'
import {
  OutputBundle,
  PluginHooks,
  rollup,
  RollupBuild,
  RollupOutput,
} from 'rollup'

type RollupBuildData = {
  build: RollupBuild
  bundle: OutputBundle
  output: RollupOutput
}

export function getRollupBuildData(
  srcDir: string,
): Promise<RollupBuildData> {
  return new Promise((resolve, reject) => {
    beforeAll(async () => {
      try {
        const data = await performBuild(srcDir)
        resolve(data)
      } catch (error) {
        reject(error)
      }
    }, 60000)
  })
}

async function performBuild(
  srcDir: string,
): Promise<RollupBuildData> {
  const config = require(path.join(srcDir, 'rollup.config.js'))
    .default

  if (typeof config.output === 'undefined')
    throw new TypeError('Rollup config must have output')

  const bundlePromise: Promise<OutputBundle> = new Promise(
    (resolve) => {
      config.plugins = config.plugins || []
      config.plugins.push({
        name: 'extract-bundle',
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
  const bundle = await bundlePromise

  return { build, bundle, output }
}
