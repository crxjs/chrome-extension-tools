// This fixes `self`'s type.
declare const self: ServiceWorkerGlobalScope
export {}

chrome.runtime.onInstalled.addListener(() => {
  chrome.runtime.openOptionsPage()
})
