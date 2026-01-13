export {}

console.log('background script loaded')

chrome.runtime.onMessage.addListener((message) => {
  console.log('received message:', message)
})
