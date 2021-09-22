import json from '@rollup/plugin-json'
// @ts-expect-error doesn't matter here
import sucrase from '@rollup/plugin-sucrase'
import fs from 'fs'
import path from 'path'
import { OutputOptions, rollup, RollupOptions } from 'rollup'
import bundleImports from 'rollup-plugin-bundle-imports'

const testFixtureDirname = path.join(
  __dirname,
  'test',
  'fixtures',
)

const config: RollupOptions = {
  input: fs
    .readdirSync(testFixtureDirname)
    .filter((filename) => filename.endsWith('ts'))
    .map((filename) => path.join(testFixtureDirname, filename)),
  output: {
    dir: path.join(testFixtureDirname, 'dist'),
    format: 'esm',
  },
  plugins: [
    json(),
    sucrase({
      transforms: ['typescript'],
    }),
    bundleImports({
      useVirtualModule: true,
      // @ts-expect-error need to fix these types
      options: {
        external: ['%PATH%'],
      },
    }),
  ],
}

const { output, ...input } = config

export default async () => {
  const build = await rollup(input)
  return build.write(output as OutputOptions)
}
