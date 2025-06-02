import { readFileSync } from 'fs'
import MagicString from 'magic-string'
import { createRequire } from 'module'
import { CrxPluginFn } from './types'
import {
  customElementsId,
  viteClientId,
  hmrWebSocketClientId,
} from './virtualFileIds'

const _require =
  typeof require === 'undefined' ? createRequire(import.meta.url) : require
// customElementsId starts with a slash, remove it for require.
const customElementsPath = _require.resolve(customElementsId.slice(1))
const customElementsCode = readFileSync(customElementsPath, 'utf8')
const customElementsMap = readFileSync(`${customElementsPath}.map`, 'utf8')

/**
 * Adds polyfills for content scripts:
 *
 * - In `@vite/client`, replace WebSocket with HMRWebSocketClient to connect
 *   content scripts directly to Vite's HMR server
 * - Enable custom elements in content scripts during development, used by Vite
 *   HMR Error Overlay.
 *
 * See Chromium bug [390807 - Content scripts can't define custom
 * elements](https://bugs.chromium.org/p/chromium/issues/detail?id=390807)
 *
 * This means custom elements will work in development but not in production.
 *
 * TODO: Autodetect calls to `customElements.define` during build; import the
 * polyfill when appropriate.
 */
export const pluginFileWriterPolyfill: CrxPluginFn = () => {
  return {
    name: 'crx:file-writer-polyfill',
    apply: 'serve',
    enforce: 'pre',
    resolveId(source) {
      if (source === customElementsId) {
        return customElementsId
      }
      if (source === hmrWebSocketClientId) {
        return hmrWebSocketClientId
      }
    },
    load(id) {
      if (id === customElementsId) {
        return { code: customElementsCode, map: customElementsMap }
      }
      if (id === hmrWebSocketClientId) {
        // Return the path to the actual HMR WebSocket client file
        return `export { HMRWebSocketClient } from '${
          new URL('../client/es/hmr-websocket-client.ts', import.meta.url)
            .pathname
        }'`
      }
    },
    renderCrxDevScript(code, { type, id }) {
      if (type === 'module' && id === viteClientId) {
        const magic = new MagicString(code)
        magic.prepend(`import '${customElementsId}';`)
        magic.prepend(
          `import { HMRWebSocketClient } from '/@crx/hmr-websocket-client';`,
        )

        // Replace WebSocket with HMRWebSocketClient
        const wsRegex = /new\s+WebSocket\s*\(/g
        let match
        while ((match = wsRegex.exec(code)) !== null) {
          magic.overwrite(
            match.index,
            match.index + match[0].length,
            'new HMRWebSocketClient(',
          )
        }

        return magic.toString()
      }
    },
  }
}
