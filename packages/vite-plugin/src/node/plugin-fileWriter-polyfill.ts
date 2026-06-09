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
 * Runtime polyfill injected into `@vite/client` when a content script is
 * configured with `shadowDom: true`. It redirects Vite's dev-time style
 * injection into the content-script's shadow root and, critically, breaks
 * a race in plugin-vue + Vite's CSS HMR cache that caused sequential CSS
 * edits to appear "one step behind" in the rendered UI (see PR #1144
 * follow-up from @nizoio).
 *
 * Exported for unit testing — see `plugin-fileWriter-polyfill.test.ts`.
 */
export const shadowDomStyleInjectionPolyfill = /* js */ `
;(function() {
  var _origHeadAppend = HTMLHeadElement.prototype.appendChild;
  HTMLHeadElement.prototype.appendChild = function(node) {
    if (node instanceof HTMLStyleElement && node.hasAttribute('data-vite-dev-id') && globalThis.__CRX_SHADOW_ROOT__) {
      // Fresh insert: drop any existing style with the same dev id first,
      // so the old stylesheet doesn't linger and "win" the cascade after
      // an HMR update.
      try {
        var id = node.getAttribute('data-vite-dev-id');
        var existing = globalThis.__CRX_SHADOW_ROOT__.querySelectorAll(
          'style[data-vite-dev-id="' + (id || '').replace(/"/g, '\\\\"') + '"]'
        );
        for (var i = 0; i < existing.length; i++) {
          var e = existing[i];
          if (e !== node) e.parentNode && e.parentNode.removeChild(e);
        }
      } catch (_) {}
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

  // Race fix for PR #1144 (@nizoio): when multiple HMR CSS updates land
  // back-to-back for the same dev id, Vite's client cache (\`sheetsMap\`)
  // reuses the existing <style> node and calls
  // \`style.textContent = newCss\`. Under the Vue SFC scoped-style HMR path
  // this can silently no-op (an in-flight fetch for the previous edit
  // wins, the DOM stays one edit behind).
  //
  // Fix: hook the textContent setter on HTMLStyleElement so that when
  // any dev-style (shadow-attached OR originally-shadow-redirected) is
  // rewritten, we clear its children and append a fresh TextNode. That
  // guarantees a MutationObserver record fires AND guarantees the
  // rendered stylesheet reflects the newest value even if Vite's cache
  // passes us an element that was detached by an earlier patch layer.
  var styleProto = HTMLStyleElement.prototype;
  var elementProto = Element.prototype;
  var desc =
    Object.getOwnPropertyDescriptor(styleProto, 'textContent') ||
    Object.getOwnPropertyDescriptor(elementProto, 'textContent') ||
    Object.getOwnPropertyDescriptor(Node.prototype, 'textContent');
  if (desc && desc.set) {
    var origSet = desc.set;
    var origGet = desc.get;
    Object.defineProperty(styleProto, 'textContent', {
      configurable: true,
      enumerable: desc.enumerable,
      get: function() { return origGet ? origGet.call(this) : ''; },
      set: function(value) {
        var shadow = globalThis.__CRX_SHADOW_ROOT__;
        var isDevStyle = this.hasAttribute && this.hasAttribute('data-vite-dev-id');
        if (shadow && isDevStyle) {
          var id = this.getAttribute('data-vite-dev-id');
          // Find the live shadow-root copy of this style (it may be this
          // element, or it may be a replacement if an earlier setter call
          // swapped it). Vite's sheetsMap may hold a detached ref to the
          // original; we always write to the shadow-root-attached node.
          var live = shadow.querySelector(
            'style[data-vite-dev-id="' + (id || '').replace(/"/g, '\\\\"') + '"]'
          );
          var target = live || this;
          // Force-clear and re-set so a same-value write still produces a
          // MutationObserver record and is never no-op'd by Vite's cache.
          while (target.firstChild) target.removeChild(target.firstChild);
          target.appendChild(target.ownerDocument.createTextNode(String(value)));
          // Also mirror onto the original caller element so any later reads
          // via Vite's cached ref don't see stale textContent.
          if (target !== this) {
            try {
              while (this.firstChild) this.removeChild(this.firstChild);
              this.appendChild(this.ownerDocument.createTextNode(String(value)));
            } catch (_) {}
          }
          return;
        }
        return origSet.call(this, value);
      },
    });
  }
})();
`

/**
 * Adds polyfills for content scripts:
 *
 * - In `@vite/client`, replace WebSocket with HMRPort to connect content scripts
 *   to background, which uses custom client to connect to server
 * - Enable custom elements in content scripts during development, used by Vite
 *   HMR Error Overlay.
 * - Redirect Vite CSS HMR into the content-script shadow root when shadow DOM
 *   content scripts are enabled.
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
        magic.append(shadowDomStyleInjectionPolyfill)
        return magic.toString()
      }
    },
  }
}
