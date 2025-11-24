declare const __SCRIPT__: string
const injectTime = performance.now()
;(async () => {
  console.warn(__SCRIPT__, 'Content-script doesn\'t support HMR because the world is MAIN');
  const { onExecute } = await import(/* @vite-ignore */ __SCRIPT__) as ContentScriptAPI.ModuleExports
  // this is the entry point of the content script, it will run each time this script is injected
  onExecute?.({ perf: { injectTime, loadTime: performance.now() - injectTime } })
})().catch(console.error)

export {}
