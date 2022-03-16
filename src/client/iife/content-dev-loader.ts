declare const __PREAMBLE__: string
declare const __CLIENT__: string
declare const __SCRIPT__: string
;(async () => {
  // remember, __PREAMBLE__ and __CLIENT__ are emitted files
  if (__PREAMBLE__)
    await import(/* @vite-ignore */ chrome.runtime.getURL(__PREAMBLE__))
  await import(/* @vite-ignore */ chrome.runtime.getURL(__CLIENT__))
  await import(/* @vite-ignore */ chrome.runtime.getURL(__SCRIPT__))
})().catch(console.error)

export {}
