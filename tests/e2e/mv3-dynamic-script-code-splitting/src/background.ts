// This fixes `self`'s type.
declare const self: ServiceWorkerGlobalScope
export {}
self.skipWaiting()
chrome.runtime.openOptionsPage()
