declare const __SCRIPT__: string
declare const __SHADOW_MODE__: string
declare const __CSS_URLS__: string[]
const injectTime = performance.now()
;(async () => {
  // Create shadow DOM host
  const host = document.createElement('crx-root')
  host.style.all = 'initial'
  const shadowRoot = host.attachShadow({ mode: __SHADOW_MODE__ as ShadowRootMode })
  document.documentElement.appendChild(host)

  // Load CSS into shadow root via constructable stylesheets
  if (__CSS_URLS__?.length) {
    const sheets = await Promise.all(
      __CSS_URLS__.map(async (url: string) => {
        const sheet = new CSSStyleSheet()
        const res = await fetch(chrome.runtime.getURL(url))
        sheet.replaceSync(await res.text())
        return sheet
      })
    )
    shadowRoot.adoptedStyleSheets = sheets
  }

  const { onExecute } = await import(/* @vite-ignore */ chrome.runtime.getURL(__SCRIPT__)) as ContentScriptAPI.ModuleExports
  // this is the entry point of the content script, it will run each time this script is injected
  onExecute?.({ perf: { injectTime, loadTime: performance.now() - injectTime }, shadowRoot })
})().catch(console.error)

export {}
