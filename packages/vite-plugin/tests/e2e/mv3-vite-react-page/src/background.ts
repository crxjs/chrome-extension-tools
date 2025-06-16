// This fixes `self`'s type.
declare const self: ServiceWorkerGlobalScope
export {}
;(async () => {
  // if we open the options page now the SW won't reroute fetches
  await new Promise((r) => setTimeout(r, 100))
  chrome.runtime.openOptionsPage()
})()
