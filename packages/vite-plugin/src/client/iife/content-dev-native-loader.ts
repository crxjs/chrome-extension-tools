declare const __PREAMBLE__: string
declare const __SCRIPT__: string
declare const __VITE_ORIGIN__: string

const injectTime = performance.now()
const fromVite = (id: string) => new URL(id, __VITE_ORIGIN__).href

;(async () => {
  if (__PREAMBLE__) {
    await import(/* @vite-ignore */ fromVite(__PREAMBLE__))
  }

  await import(/* @vite-ignore */ fromVite('/@vite/client'))

  const { onExecute } = (await import(
    /* @vite-ignore */ fromVite(__SCRIPT__)
  )) as ContentScriptAPI.ModuleExports

  // this is the entry point of the content script, it will run each time this script is injected
  onExecute?.({
    perf: { injectTime, loadTime: performance.now() - injectTime },
  })
})().catch(console.error)

export {}
