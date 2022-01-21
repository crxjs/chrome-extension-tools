// This fixes `self`'s type.
declare const self: ServiceWorkerGlobalScope
export {}

chrome.runtime.onInstalled.addListener(async ({ reason }) => {
  await self.skipWaiting()
  if (reason === chrome.runtime.OnInstalledReason.INSTALL)
    chrome.runtime.openOptionsPage()
})
