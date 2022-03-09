declare const __PREAMBLE__: string
declare const __CLIENT__: string
declare const __SCRIPT__: string
declare const __TIMESTAMP__: number

/** Bust content script cache; support full reload w/o runtime reload */
function crxUrlWithTime(url: string) {
  const crxUrl = new URL(chrome.runtime.getURL(url))
  const time = __TIMESTAMP__
  crxUrl.searchParams.set('t', time.toString())
  return crxUrl.href
}

;(async () => {
  // remember, __PREAMBLE__ and __CLIENT__ are emitted files
  if (__PREAMBLE__)
    await import(/* @vite-ignore */ crxUrlWithTime(__PREAMBLE__))
  await import(/* @vite-ignore */ crxUrlWithTime(__CLIENT__))
  await import(/* @vite-ignore */ crxUrlWithTime(__SCRIPT__))
})().catch(console.error)

export {}
