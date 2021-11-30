import json from '@rollup/plugin-json'
// @ts-expect-error doesn't matter here
import sucrase from '@rollup/plugin-sucrase'
import fs from 'fs'
import path from 'path'
import { OutputOptions, rollup, RollupOptions } from 'rollup'
import bundleImports from 'rollup-plugin-bundle-imports'
import { format } from './src/helpers'

const browserCodeDirname = path.join(__dirname, 'src', 'browser')
const browserCodeDirFiles = fs
  .readdirSync(browserCodeDirname)
  .filter((filename) => filename.startsWith('code-'))

const swCodeDirname = path.join(
  __dirname,
  'src',
  'service-worker',
)
const swCodeDirFiles = fs
  .readdirSync(swCodeDirname)
  .filter((filename) => filename.startsWith('code-'))

const testFixtureDirname = path.join(
  __dirname,
  'test',
  'fixtures',
)

const entryFiles = browserCodeDirFiles.concat(swCodeDirFiles)

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
        let importPath: string | undefined
        if (browserCodeDirFiles.includes(id)) {
          importPath = path.join(browserCodeDirname, id)
        } else if (swCodeDirFiles.includes(id)) {
          importPath = path.join(swCodeDirname, id)
        }

        if (importPath)
          return format`import { code } from 'code ${importPath}'
                       export { code }`

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
