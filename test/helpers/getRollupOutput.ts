/* eslint-env jest */

import path from 'path'
import { rollup, RollupOptions, RollupOutput } from 'rollup'

export async function getRollupOutput(
  ...configPath: string[]
): Promise<RollupOutput> {
  const config = require(path.join(...configPath))
    .default as RollupOptions
  const bundle = await rollup(config)
  const output = bundle.generate(config.output as any)
  return output
}
