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
import {
  TransformResult,
  transformWithEsbuild,
  ViteDevServer,
} from 'vite'
import { isString } from './helpers'

export async function writeAsIIFE(
  file: EmittedChunk,
  server: ViteDevServer,
) {
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

const modules = new Map<string, TransformResult>()

export function resolveFromServer(
  server: ViteDevServer,
): Plugin {
  return {
    name: 'resolve-from-vite-dev-server',
    resolveId(source) {
      if (source.startsWith('/@fs')) return source

      const id = path.join(server.config.root, source)
      const fileExists = fs.existsSync(id)
      return fileExists ? id : false
    },
    async load(id) {
      try {
        let result: TransformResult
        if (id.startsWith('/@fs') && modules.has(id)) {
          result = modules.get(id)!
        } else {
          const x = await server.transformRequest(id)
          if (!x) return null
          if (isString(x)) {
            result = { code: x, map: null }
          } else {
            // @ts-expect-error transformRequest return type is unworkable
            result = x
          }
          if (isUndefined(result.code)) return null
        }

        if (id.startsWith('/@fs') && !modules.has(id)) {
          result = await transformWithEsbuild(result.code, id, {
            format: 'esm',
          })
          modules.set(id, result)
        }

        const { code, map } = result
        return { code, map }
      } catch (error) {
        console.log(`Could not load ${id}`)
        console.error(error)
        return null
      }
    },
  }
}
