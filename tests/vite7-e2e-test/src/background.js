console.log('[CRXJS Vite7 E2E] Background script loaded!')

chrome.runtime.onInstalled.addListener(() => {
  console.log('[CRXJS Vite7 E2E] Extension installed!')
})
