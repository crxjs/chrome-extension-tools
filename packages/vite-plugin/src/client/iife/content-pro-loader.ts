declare const __SCRIPT__: string
;(async () => {
  await import(/* @vite-ignore */ chrome.runtime.getURL(__SCRIPT__))
})().catch(console.error)

export {}
