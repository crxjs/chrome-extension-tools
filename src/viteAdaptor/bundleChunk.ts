import { isString } from '../helpers'
import fs from 'fs'
import { isUndefined } from 'lodash'
import path from 'path'
import {
  EmittedChunk,
  InputOptions,
  OutputOptions,
  Plugin,
  rollup,
} from 'rollup'
import { ViteDevServer } from 'vite'

export const resolveFromServer = (
  server: ViteDevServer,
): Plugin => ({
  name: 'resolve-from-vite-dev-server',
  resolveId(source) {
    if (source.startsWith('/@fs')) return source

    const id = path.join(server.config.root, source)

    return fs.existsSync(id) ? id : false
  },
  async load(id) {
    try {
      const result = await server.transformRequest(id)

      if (!result) return null
      if (isString(result)) return result
      if (isUndefined(result.code))
        throw new Error('result.code is undefined')

      const { code, map, ast } = result
      return { code, map, ast }
    } catch (error) {
      console.log(`Could not load ${id}`)
      console.error(error)
      return null
    }
  },
})

export const bundleChunk = async (
  file: EmittedChunk,
  server: ViteDevServer,
) => {
  const inputOptions: InputOptions = {
    input: path.relative(server.config.root, file.id),
    plugins: [resolveFromServer(server)],
  }
  const build = await rollup(inputOptions)
  const options: OutputOptions = {
    format: 'iife',
    file: path.join(server.config.build.outDir, file.fileName!),
  }
  return build.write(options)
}
