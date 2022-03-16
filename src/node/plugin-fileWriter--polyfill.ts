import { readFileSync } from 'fs-extra'
import MagicString from 'magic-string'
import { createRequire } from 'module'
import { idByUrl } from './fileMeta'
import { CrxPluginFn } from './types'
import {
  contentHmrPortId,
  customElementsId,
  viteClientId,
} from './virtualFileIds'

const _require =
  typeof require === 'undefined' ? createRequire(import.meta.url) : require
const customElementsPath = _require.resolve(customElementsId)
const customElementsCode = readFileSync(customElementsPath, 'utf8')
const customElementsMap = readFileSync(`${customElementsPath}.map`, 'utf8')

/**
 * Adds polyfills for content scripts:
 *
 * - In `@vite/client`, replace WebSocket with HMRPort to connect content scripts
 *   to background, which uses custom client to connect to server
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
    apply: 'build',
    enforce: 'pre',
    load(id) {
      if (id === idByUrl.get(customElementsId)) {
        return { code: customElementsCode, map: customElementsMap }
      }
    },
    transform(code, id) {
      if (id === idByUrl.get(viteClientId)) {
        const magic = new MagicString(code)
        magic.prepend(`import '${customElementsId}';`)
        magic.prepend(`import { HMRPort } from '${contentHmrPortId}';`)
        const ws = 'new WebSocket'
        const index = code.indexOf(ws)
        magic.overwrite(index, index + ws.length, 'new HMRPort')
        return { code: magic.toString(), map: magic.generateMap() }
      }
    },
  }
}
