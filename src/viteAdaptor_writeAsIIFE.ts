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
import { format, isString } from './helpers'

export async function writeAsIIFE(
  file: EmittedChunk,
  server: ViteDevServer,
): Promise<void> {
  try {
    const inputOptions: InputOptions = {
      input: path.relative(server.config.root, file.id),
      plugins: [resolveFromServer(server)],
    }
    const build = await rollup(inputOptions)
    const options: OutputOptions = {
      format: 'iife',
      file: path.join(
        server.config.build.outDir,
        file.fileName!,
      ),
    }
    await build.write(options)
  } catch (error) {
    if (error.message?.includes('is not exported by')) {
      // TODO: add documentation with example
      const message = format`Could not bundle ${file.id} because Vite did not pre-bundle a dependency.
          You may need to add this dependency to your Vite config under \`optimizeDeps.include\`.
          Original Error: ${error.message}`
      throw new Error(message)
    } else if (error.message)
      throw new Error(
        format`An error occurred while writing ${file.id}
        Error: ${error.message}`,
      )
    else throw error
  }
}

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
        const result = await server.transformRequest(id)
        if (!result) return null
        if (isString(result)) return result
        if (isUndefined(result.code)) return null

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
