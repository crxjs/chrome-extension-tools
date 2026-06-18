import { readFileSync } from 'fs'
import MagicString from 'magic-string'
import { createRequire } from 'module'
import { CrxPluginFn } from './types'
import {
  contentHmrPortId,
  customElementsId,
  viteClientId,
} from './virtualFileIds'

const _require =
  typeof require === 'undefined' ? createRequire(import.meta.url) : require

const unsafeOwnerDocumentRegistryAccess = 'this.ownerDocument.__CE_registry'
const safeOwnerDocumentRegistryAccess =
  'this.ownerDocument&&this.ownerDocument.__CE_registry'

interface CustomElementsPolyfill {
  code: string
  map: string
}

let customElementsPolyfill: CustomElementsPolyfill | undefined

export function patchCustomElementsPolyfill(code: string): string {
  return code
    .split(unsafeOwnerDocumentRegistryAccess)
    .join(safeOwnerDocumentRegistryAccess)
}

function loadCustomElementsPolyfill(): CustomElementsPolyfill {
  if (customElementsPolyfill) return customElementsPolyfill

  // customElementsId starts with a slash, remove it for require.
  const customElementsPath = _require.resolve(customElementsId.slice(1))

  customElementsPolyfill = {
    code: patchCustomElementsPolyfill(readFileSync(customElementsPath, 'utf8')),
    map: readFileSync(`${customElementsPath}.map`, 'utf8'),
  }

  return customElementsPolyfill
}

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
    apply: 'serve',
    enforce: 'pre',
    resolveId(source) {
      if (source === customElementsId) {
        return customElementsId
      }
    },
    load(id) {
      if (id === customElementsId) {
        return loadCustomElementsPolyfill()
      }
    },
    renderCrxDevScript(code, { type, id }) {
      if (type === 'module' && id === viteClientId) {
        const magic = new MagicString(code)
        magic.prepend(`import '${customElementsId}';`)
        magic.prepend(`import { HMRPort } from '${contentHmrPortId}';`)
        const ws = 'new WebSocket'
        const index = code.indexOf(ws)
        magic.overwrite(index, index + ws.length, 'new HMRPort')
        return magic.toString()
      }
    },
  }
}
