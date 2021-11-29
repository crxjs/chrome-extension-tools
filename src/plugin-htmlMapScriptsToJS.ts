import cheerio from 'cheerio'
import { CrxPlugin } from './types'

/**
 * Rewrites HTML script tag file extensions from JSX, TS, or TSX to JS
 */
export const htmlMapScriptsToJS = (): CrxPlugin => {
  let disablePlugin = false
  return {
    name: 'html-map-scripts-to-JS',
    crx: true,
    enforce: 'post',
    configureServer() {
      disablePlugin = true
    },
    renderCrxHtml(source) {
      if (disablePlugin) return null

      const $ = cheerio.load(source)

      $('script[src]')
        .not('[data-rollup-asset]')
        .not('[src^="http:"]')
        .not('[src^="https:"]')
        .not('[src^="data:"]')
        .attr('type', 'module')
        .attr('src', (i, value) => {
          const result = value.replace(/\.[jt]sx?/g, '.js')
          return result
        })

      return $.html()
    },
  }
}
