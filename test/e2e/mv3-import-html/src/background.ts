// This fixes `self`'s type.
declare const self: ServiceWorkerGlobalScope
export {}

chrome.runtime.onInstalled.addListener(async () => {
  await self.skipWaiting()
  chrome.runtime.openOptionsPage()
})
