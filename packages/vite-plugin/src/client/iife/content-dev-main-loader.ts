declare const __SCRIPT__: string
declare const __PREAMBLE__: string
declare const __CLIENT__: string
const injectTime = performance.now()
;(async () => {
  try {
    if (__PREAMBLE__) await import(/* @vite-ignore */ __PREAMBLE__)
    await import(/* @vite-ignore */ __CLIENT__)
  } catch (error) {
    console.warn('[crx] MAIN world HMR client failed to load', error)
  }

  const { onExecute } = (await import(
    /* @vite-ignore */ __SCRIPT__
  )) as ContentScriptAPI.ModuleExports
  // this is the entry point of the content script, it will run each time this script is injected
  onExecute?.({
    perf: { injectTime, loadTime: performance.now() - injectTime },
  })
})().catch(console.error)

export {}
