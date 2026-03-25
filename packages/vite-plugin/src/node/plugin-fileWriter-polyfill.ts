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
// customElementsId starts with a slash, remove it for require.
const customElementsPath = _require.resolve(customElementsId.slice(1))
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
    apply: 'serve',
    enforce: 'pre',
    resolveId(source) {
      if (source === customElementsId) {
        return customElementsId
      }
    },
    load(id) {
      if (id === customElementsId) {
        return { code: customElementsCode, map: customElementsMap }
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

        // Patch CSS injection to target shadow root when available
        // This wraps the head element's appendChild/removeChild to redirect
        // style elements with data-vite-dev-id to the shadow root
        magic.append(`
;(function() {
  var _origHeadAppend = HTMLHeadElement.prototype.appendChild;
  HTMLHeadElement.prototype.appendChild = function(node) {
    if (node instanceof HTMLStyleElement && node.hasAttribute('data-vite-dev-id') && globalThis.__CRX_SHADOW_ROOT__) {
      return globalThis.__CRX_SHADOW_ROOT__.appendChild(node);
    }
    return _origHeadAppend.call(this, node);
  };
  var _origHeadRemove = HTMLHeadElement.prototype.removeChild;
  HTMLHeadElement.prototype.removeChild = function(node) {
    if (node instanceof HTMLStyleElement && node.hasAttribute('data-vite-dev-id') && globalThis.__CRX_SHADOW_ROOT__) {
      try { return globalThis.__CRX_SHADOW_ROOT__.removeChild(node); } catch(e) { return node; }
    }
    return _origHeadRemove.call(this, node);
  };
  // Also patch querySelector for style lookups (Vite uses this to find existing styles)
  var _origQS = Document.prototype.querySelector;
  Document.prototype.querySelector = function(selector) {
    if (typeof selector === 'string' && selector.includes('data-vite-dev-id') && globalThis.__CRX_SHADOW_ROOT__) {
      return globalThis.__CRX_SHADOW_ROOT__.querySelector(selector) || _origQS.call(this, selector);
    }
    return _origQS.call(this, selector);
  };
})();
`)

        return magic.toString()
      }
    },
  }
}
