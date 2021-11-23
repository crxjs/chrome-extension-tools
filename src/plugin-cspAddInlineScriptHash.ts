import { simple } from 'acorn-walk'
import type { Node } from 'acorn'
import MagicString from 'magic-string'
import cheerio from 'cheerio'
import { createHash } from 'crypto'
import { addToCspScriptSrc } from './plugin_helpers'
import { CrxPlugin } from './types'
import { ViteDevServer } from 'vite'

interface AcornLiteral extends Node {
  type: 'Literal'
  raw: string
  value: string
}

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
export const cspAddInlineScriptHash = (): CrxPlugin => {
  let server: ViteDevServer
  const scripts = new Set<string>()

  return {
    name: 'csp-add-inline-script-hash',
    crx: true,
    enforce: 'post',
    configureServer(s) {
      server = s
    },
    renderCrxHtml(source) {
      const $ = cheerio.load(source)

      $('script[type="module"]')
        .not('[src]')
        .each((i, el) => {
          const $tag = $(el)
          const script = $tag.html()
          if (script === null) return

          const literals: AcornLiteral[] = []
          const ast = this.parse(script)
          simple(ast, {
            ImportDeclaration(n) {
              simple(n, {
                Literal(l) {
                  literals.push(l as any)
                },
              })
            },
          })

          const serverUrl = `http://localhost:${server.config.server.port}`
          const magic = new MagicString(script)
          literals.forEach((node) => {
            const url = serverUrl + node.value
            magic.overwrite(node.start, node.end, `"${url}"`)
          })

          const newScript = magic.toString()
          scripts.add(newScript)
          $tag.html(newScript)
        })

      return $.html()
    },
    renderCrxManifest(manifest) {
      const hashes = Array.from(scripts).map((script) => {
        const hash = createHash('sha256')
          .update(script)
          .digest('base64')
        return `'sha256-${hash}'`
      })

      addToCspScriptSrc(manifest, hashes)

      return manifest
    },
  }
}
