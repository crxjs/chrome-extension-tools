declare const __SCRIPT__: string

localStorage.setItem('__CRX_EXTEND_ID__', chrome.runtime.id)
const injectTime = performance.now()
;(async () => {
  const { onExecute } = await import(/* @vite-ignore */ chrome.runtime.getURL(__SCRIPT__)) as ContentScriptAPI.ModuleExports
  // this is the entry point of the content script, it will run each time this script is injected
  onExecute?.({ perf: { injectTime, loadTime: performance.now() - injectTime } })
})().catch(console.error)

export {}
