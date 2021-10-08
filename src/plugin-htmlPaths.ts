import cheerio from 'cheerio'
import { ViteDevServer } from 'vite'
import { isNumber } from './helpers'
import { dirname, join, relative } from './path'
import { findRPCE } from './plugin_helpers'
import { RPCEPlugin } from './types'

export const htmlPaths = (): RPCEPlugin => {
  let server: ViteDevServer | undefined
  let root: string
  return {
    name: 'html-paths',
    configResolved({ plugins }) {
      root = findRPCE(plugins)?.api.root
    },
    configureServer(s) {
      server = s
    },
    buildStart({ plugins = [] }) {
      root = root ?? findRPCE(plugins)?.api.root
    },
    renderCrxHtml(source, { id }) {
      const $ = cheerio.load(source)

      $('script')
        .not('[data-rollup-asset]')
        .not('[src^="http:"]')
        .not('[src^="https:"]')
        .not('[src^="data:"]')
        .not('[src^="/"]')
        .attr('type', 'module')
        .attr('src', (i, value) => {
          let result: string
          const { port } = server?.config.server ?? {}
          if (isNumber(port)) {
            const relPath = relative(root, id)
            const relDir = dirname(relPath)

            // TODO: don't use vite server url if mv3
            result = `http://localhost:${port}/${
              relDir === '.' ? value : join(relDir, value)
            }`
          } else {
            result = value.replace(/\.[jt]sx?/g, '.js')
          }
          return result
        })

      return $.html()
    },
  }
}
