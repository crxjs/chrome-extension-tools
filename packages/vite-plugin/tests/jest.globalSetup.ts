import fs from 'fs'
import path from 'path'
import { OutputOptions, rollup } from 'rollup'
import configs from '../rollup.config'
import { normalizePath } from '@rollup/pluginutils'
import _debug from 'debug'

const debug = _debug('jest:global-setup')

const clientDir = path.resolve(__dirname, '..', 'src', 'client')
const outDir = normalizePath(path.join(__dirname, 'artifacts'))

function getClientFiles() {
  const files = fs
    .readdirSync(clientDir, { withFileTypes: true })
    .filter((dirent) => dirent.isDirectory())
    .flatMap((dirent) => {
      const type = dirent.name
      const dir = path.join(clientDir, dirent.name)
      return fs
        .readdirSync(dir, { withFileTypes: true })
        .filter((dirent) => dirent.isFile())
        .map((dirent) => dirent.name)
        .map((f) => path.posix.join(type, f))
    })

  return files
}

const clientFiles = getClientFiles()
debug('client files %o', clientFiles)

const [config] = configs
config.input = clientFiles.map((f) => normalizePath(f))
config.output = { dir: outDir, format: 'esm', sourcemap: true, plugins: [] }
config.plugins?.push(
  {
    name: 'load virtual import files',
    resolveId(source, importer) {
      if (!importer) {
        debug('entry file %s', source)
        return source
      }
      return null
    },
    load(id) {
      debug('load %s', id)
      let importPath: string | undefined
      if (clientFiles.includes(id)) {
        importPath = path.posix.join(clientDir, id)
      }

      if (importPath)
        return `
import clientCode from '${importPath}?client'
export default clientCode`.trim()

      return null
    },
  },
  {
    name: 'fix output filename',
    generateBundle(options, bundle) {
      for (const chunk of Object.values(bundle)) {
        if (chunk.type === 'chunk') {
          const format = path
            .dirname(chunk.facadeModuleId!)
            .split('/')
            .pop() as 'es' | 'iife'
          chunk.fileName = path.join(format, chunk.fileName)
        }
      }
    },
  },
)

debug('client build config %O', config)

export default async () => {
  try {
    const build = await rollup(config)
    await build.write(config.output as OutputOptions)
  } catch (error) {
    console.error(error)
  }
}
