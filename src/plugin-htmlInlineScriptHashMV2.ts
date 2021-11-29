import { simple } from 'acorn-walk'
import type { Node } from 'acorn'
import MagicString from 'magic-string'
import cheerio from 'cheerio'
import { createHash } from 'crypto'
import { addToCspScriptSrc } from './plugin_helpers'
import { CrxPlugin, isMV2 } from './types'
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
 * [MV2] Add a hash to the manifest CSP
 *
 * [MV3 IDEA] Replace inline scripts with a script tag `src` attribute,
 * then resolve and load that path on the server.
 * This will require some trickery in the SW to get the timing right.
 * [MV3 IDEA] Wrap script tags in a dynamic import script that loads them after inline scripts.
 * Is this implementation specific? Just use it with
 */
export const cspAddInlineScriptHash = (): CrxPlugin => {
  let mv2: boolean
  let server: ViteDevServer
  const scripts = new Set<string>()

  return {
    name: 'csp-add-inline-script-hash',
    crx: true,
    enforce: 'post',
    configureServer(s) {
      server = s
    },
    transformCrxManifest(manifest) {
      mv2 = isMV2(manifest)
      return null
    },
    renderCrxHtml(source) {
      if (!mv2) return

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
      if (!mv2) return null

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
