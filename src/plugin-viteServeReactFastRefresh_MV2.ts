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
 * @vitejs/plugin-react adds a Fast Refresh prelude to HTML pages as an inline script.
 * The prelude must run before any React code. An inline script guarantees this.
 *
 * The Chrome Extension default CSP blocks inline script tags.
 *
 * In MV2, we can add a hash to the CSP to allow a specific script tag.
 */
export const viteServeReactFastRefresh_MV2 = (): CrxPlugin => {
  let isDisabled: boolean
  let server: ViteDevServer
  const scripts = new Set<string>()

  return {
    name: 'vite-serve-react-fast-refresh-mv2',
    crx: true,
    enforce: 'post',
    configureServer(s) {
      server = s
    },
    transformCrxManifest(manifest) {
      isDisabled = !isMV2(manifest)
      return null
    },
    renderCrxHtml(source) {
      if (isDisabled) return

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
      if (isDisabled) return null

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
