declare const __PREAMBLE__: string
declare const __CLIENT__: string
declare const __SCRIPT__: string
declare const __SHADOW_MODE__: string
const injectTime = performance.now()
;(async () => {
  // Create shadow DOM host before any imports so CSS injection targets the shadow root
  const host = document.createElement('crx-root')
  host.style.all = 'initial'
  const shadowRoot = host.attachShadow({ mode: __SHADOW_MODE__ as ShadowRootMode })
  document.documentElement.appendChild(host)

  // Store globally so patched Vite CSS injection targets this shadow root
  ;(globalThis as any).__CRX_SHADOW_ROOT__ = shadowRoot

  // remember, __PREAMBLE__ and __CLIENT__ are emitted files
  if (__PREAMBLE__)
    await import(/* @vite-ignore */ chrome.runtime.getURL(__PREAMBLE__))
  await import(/* @vite-ignore */ chrome.runtime.getURL(__CLIENT__))
  const { onExecute } = await import(/* @vite-ignore */ chrome.runtime.getURL(__SCRIPT__)) as ContentScriptAPI.ModuleExports
  // this is the entry point of the content script, it will run each time this script is injected
  onExecute?.({ perf: { injectTime, loadTime: performance.now() - injectTime }, shadowRoot })
})().catch(console.error)

export {}
