// This fixes `self`'s type.
declare const self: ServiceWorkerGlobalScope
declare const __HELLO_WORLD__: string

export {}

console.log('defined', __HELLO_WORLD__)

chrome.runtime.onInstalled.addListener(() => {
  chrome.runtime.openOptionsPage()
})
