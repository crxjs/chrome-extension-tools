import json from '@rollup/plugin-json'
import fs from 'fs'
import path from 'path'
import { OutputOptions, rollup, RollupOptions } from 'rollup'
import bundleImports from 'rollup-plugin-bundle-imports'
import { format } from '../src/helpers'
import esbuild from 'rollup-plugin-esbuild'

const rootDirname = path.resolve(__dirname, '..')

const browserCodeDirname = path.join(
  rootDirname,
  'src',
  'browser',
)
const browserCodeDirFiles = fs
  .readdirSync(browserCodeDirname)
  .filter((filename) => filename.startsWith('code-'))

const swCodeDirname = path.join(
  rootDirname,
  'src',
  'service-worker',
)
const swCodeDirFiles = fs
  .readdirSync(swCodeDirname)
  .filter((filename) => filename.startsWith('code-'))

const testFixtureDirname = path.join(__dirname, 'fixtures')

const entryFiles = browserCodeDirFiles.concat(swCodeDirFiles)

const config: RollupOptions = {
  input: entryFiles,
  output: {
    dir: testFixtureDirname,
    format: 'esm',
  },
  plugins: [
    {
      name: 'virtual code import files',
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
          return format`
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          import { code } from 'code ${importPath}'
                       export { code }`

        return null
      },
    },
    json(),
    esbuild(),
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
