console.log('[Background] Service worker started at', new Date().toISOString())

// Test HMR by changing this message
console.log('[Background] HMR is working! Version 3')
console.log('[Background] This should definitely show up!')

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[Background] Received message:', message, 'from', sender)
  sendResponse({ received: true, timestamp: new Date().toISOString() })
})

// Add a test to ensure the script is running
chrome.runtime.onInstalled.addListener(() => {
  console.log('[Background] Extension installed/updated!')
})

// Listen for HMR reload events
if (import.meta.hot) {
  import.meta.hot.on('crx:runtime-reload', () => {
    console.log('[Background] Reloading extension...')
    chrome.runtime.reload()
  })
}

export {}
