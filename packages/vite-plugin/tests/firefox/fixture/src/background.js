import { answer } from './shared.js'

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type !== 'firefox-e2e') return
  chrome.storage.local.set({ source: message.source }).then(() => {
    sendResponse({ answer })
  })
  return true
})
