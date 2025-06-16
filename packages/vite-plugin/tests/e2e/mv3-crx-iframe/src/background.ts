// This fixes `self`'s type.
declare const self: ServiceWorkerGlobalScope
export {}

chrome.runtime.onInstalled.addListener(async () => {
  await new Promise((r) => setTimeout(r, 100))
  chrome.runtime.openOptionsPage()
})
