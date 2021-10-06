import json from '@rollup/plugin-json'
// @ts-expect-error doesn't matter here
import sucrase from '@rollup/plugin-sucrase'
import fs from 'fs'
import path from 'path'
import { OutputOptions, rollup, RollupOptions } from 'rollup'
import bundleImports from 'rollup-plugin-bundle-imports'
import { format } from './src/helpers'

const browserCodeDirname = path.join(__dirname, 'src', 'browser')

const testFixtureDirname = path.join(
  __dirname,
  'test',
  'fixtures',
)

const entryFiles = fs
  .readdirSync(browserCodeDirname)
  .filter((filename) => filename.startsWith('code-'))

const config: RollupOptions = {
  input: entryFiles,
  output: {
    dir: testFixtureDirname,
    format: 'esm',
  },
  plugins: [
    {
      resolveId(source, importer) {
        if (!importer) return source
        return null
      },
      load(id) {
        if (entryFiles.includes(id)) {
          const importPath = path.join(browserCodeDirname, id)
          return format`import { code } from 'code ${importPath}'
                         export { code }`
        }
        return null
      },
    },
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

export default async () => {
  try {
    const build = await rollup(config)
    await build.write(config.output as OutputOptions)
  } catch (error) {
    console.error(error)
  }
}
