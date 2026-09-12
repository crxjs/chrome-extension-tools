import esbuild from 'rollup-plugin-esbuild'
import fs from 'fs-extra'
import jsesc from 'jsesc'
import path from 'pathe'
import { rollup, type Plugin } from 'rollup'

const root = process.cwd()

/**
 * Resolves `client/*` imports to the bundled client code string: `es/` modules
 * are bundled as ES modules, `iife/` modules as IIFEs and `html/` files are
 * read as-is. Shared by the tsdown build and the client test artifacts build.
 */
export const bundleClientCode = (): Plugin => {
  const PREFIX = '\0client/'
  return {
    name: 'bundleClientCode',
    async resolveId(source) {
      if (source.startsWith('client/')) {
        return PREFIX + path.resolve(root, 'src/client', source.slice('client/'.length))
      }
    },
    async load(_id) {
      if (_id.startsWith(PREFIX)) {
        const input = _id.slice(PREFIX.length)
        const format = path.dirname(input).split('/').pop() as
          | 'es'
          | 'iife'
          | 'html'

        let result: string
        if (format === 'html') {
          result = await fs.readFile(input, { encoding: 'utf8' })
        } else {
          const build = await rollup({
            input,
            external: [],
            plugins: [esbuild({ legalComments: 'inline' })],
          })
          const { output } = await build.generate({ format })
          result = output[0].code
        }

        this.addWatchFile(input)

        return `export default "${jsesc(result, { quotes: 'double' })}"`
      }
    },
  }
}
