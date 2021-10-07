import { ViteDevServer } from 'vite'
import { Plugin } from 'rollup'
import { isString } from './helpers'
import { dirname, join, parse, relative } from './path'
import cheerio from 'cheerio'

export const VITE_SERVER_URL = '__VITE_SERVER_URL__'
export const viteServerUrlRegExp = new RegExp(
  VITE_SERVER_URL,
  'g',
)

export const replaceViteServerUrl = (
  server: ViteDevServer,
): Plugin => {
  const { root } = server.config
  const { port } = server.config.server
  const origin = `http://localhost:${port}`

  return {
    name: 'replace-vite-server-url',
    generateBundle(options, bundle) {
      const files = Object.entries(bundle)
      for (const [id, file] of files) {
        if (file.type === 'asset') {
          if (!isString(file.source)) continue

          // TODO: move render plugins hook into generate bundle
          // this whole __VITE_SERVER_URL__ concept will no longer be necessary
          if (parse(file.fileName).ext === '.html') {
            const $ = cheerio.load(file.source)

            $('script')
              .not('[data-rollup-asset]')
              .not('[src^="http:"]')
              .not('[src^="https:"]')
              .not('[src^="data:"]')
              .not('[src^="/"]')
              .attr('type', 'module')
              .attr('src', (i, value) => {
                if (viteServerUrlRegExp.test(value)) return value

                const relPath = relative(root, id)
                const relDir = dirname(relPath)

                const result = `${VITE_SERVER_URL}/${
                  relDir === '.' ? value : join(relDir, value)
                }`
                return result
              })

            $('script[src^="/"]').attr('src', (i, value) => {
              if (viteServerUrlRegExp.test(value)) return value

              const result = VITE_SERVER_URL + value
              return result
            })

            file.source = $.html()
          }

          file.source = file.source.replace(
            viteServerUrlRegExp,
            origin,
          )
        } else {
          file.code = file.code.replace(
            viteServerUrlRegExp,
            origin,
          )
        }
      }
    },
  }
}
