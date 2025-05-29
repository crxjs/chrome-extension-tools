declare const __PREAMBLE__: string
declare const __CLIENT__: string
declare const __SCRIPT__: string
const injectTime = performance.now()
;(async () => {
  // remember, __PREAMBLE__ and __CLIENT__ are emitted files
  if (__PREAMBLE__)
    await import(/* @vite-ignore */ chrome.runtime.getURL(__PREAMBLE__))
  await import(/* @vite-ignore */ chrome.runtime.getURL(__CLIENT__))
  if (import.meta.hot) {
    import.meta.hot.on('crx:runtime-reload', () => {
      console.log('[crx] runtime reload')
      location.reload()
    })
  }
  const { onExecute } = await import(/* @vite-ignore */ chrome.runtime.getURL(__SCRIPT__)) as ContentScriptAPI.ModuleExports
  // this is the entry point of the content script, it will run each time this script is injected
  onExecute?.({ perf: { injectTime, loadTime: performance.now() - injectTime } })
})().catch(console.error)

export {}
