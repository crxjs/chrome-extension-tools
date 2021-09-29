import cheerio from 'cheerio'
import { dirname, join, relative } from 'path'
import { findRPCE } from './plugin_helpers'
import { RPCEPlugin } from './types'
import { VITE_SERVER_URL } from './viteAdaptor.machine'

export const htmlPaths = (): RPCEPlugin => {
  let isViteServe = false
  let root: string
  return {
    name: 'html-paths',
    config(options, { command }) {
      isViteServe = command === 'serve'
    },
    configResolved({ plugins }) {
      root = findRPCE(plugins)?.api.root
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
          if (isViteServe) {
            const relPath = relative(root, id)
            const relDir = dirname(relPath)

            result = `${VITE_SERVER_URL}/${
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
