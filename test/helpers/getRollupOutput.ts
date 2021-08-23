/* eslint-env jest */

import path from 'path'
import { rollup, RollupOptions, RollupOutput } from 'rollup'

export function getRollupOutput(
  ...configPath: string[]
): Promise<RollupOutput> {
  return new Promise<RollupOutput>((resolve, reject) => {
    beforeAll(async () => {
      try {
        const config = require(path.join(...configPath))
          .default as RollupOptions
        const bundle = await rollup(config)
        const output = bundle.generate(config.output as any)
        resolve(output)
        return output
      } catch (error) {
        reject(error)
        throw error
      }
    }, 30000)
  })
}
