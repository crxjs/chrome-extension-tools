import cheerio from 'cheerio'
import { CrxPlugin } from './types'

/**
 * Chrome Extensions don't support inline script tags.
 *
 * One of the main sources of inline script tags is @vitejs/plugin-react,
 * which adds a prelude to HTML pages as an inline script.
 *
 * [FAIL] Replace inline scripts with a script tag `src` attribute,
 * then resolve and load that path on the server.
 *
 * [IDEA] Add a hash to the manifest CSP, this will work in MV2, but not in MV3
 * [IDEA] Wrap script tags in a dynamic import script that loads them after inline scripts
 */
export const htmlInlineScripts = (): CrxPlugin => {
  const scripts = new Set<string>()
  let isBuild = false

  // TODO: enable in index.ts when ready
  return {
    name: 'html-inline-scripts',
    crx: true,
    enforce: 'post',
    config(config, { command }) {
      isBuild = command === 'build'
    },
    renderCrxHtml(source) {
      if (isBuild) return

      const $ = cheerio.load(source)

      $('script[type="module"]')
        .not('[src]')
        .each((i, el) => {
          const $tag = $(el)
          const script = $tag.text()
          scripts.add(script)
        })

      return $.html()
    },
    renderCrxManifest(source) {
      if (isBuild) return

      // TODO: add hashes to manifest
      return source
    },
  }
}
