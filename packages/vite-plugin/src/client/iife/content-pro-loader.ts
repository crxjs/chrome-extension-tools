declare const __SCRIPT__: string
const injectTime = performance.now()
;(async () => {
  const { run } = await import(/* @vite-ignore */ chrome.runtime.getURL(__SCRIPT__)) as ContentScriptAPI
  // this is the entry point of the content script, it will run each time this script is injected
  run?.({ perf: { injectTime, loadTime: performance.now() - injectTime } })
})().catch(console.error)

export {}
