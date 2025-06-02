console.log('[Content Script] Loaded at', new Date().toISOString())

// Test HMR by changing this message
console.log('[Content Script] WebSocket HMR is working! Version 2')

// Test sending message to background
chrome.runtime.sendMessage(
  { from: 'content', test: 'websocket-hmr' },
  (response) => {
    console.log('[Content Script] Got response:', response)
  },
)

// Add a visual indicator to the page
const indicator = document.createElement('div')
indicator.id = 'crx-hmr-indicator'
indicator.style.cssText = `
  position: fixed;
  top: 10px;
  right: 10px;
  background: #4CAF50;
  color: white;
  padding: 10px;
  border-radius: 5px;
  z-index: 9999;
  font-family: monospace;
`
indicator.textContent = 'CRX WebSocket HMR Active - v2'

// Wait for DOM to be ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    document.body.appendChild(indicator)
  })
} else {
  console.log('[Content Script] DOM already loaded')
  document.body.style.backgroundColor = 'red'
  document.body.appendChild(indicator)
}

// Test HMR updates
if (import.meta.hot) {
  document.body.style.backgroundColor = 'red'
  import.meta.hot.accept(() => {
    document.body.style.backgroundColor = 'red'
    console.log('[Content Script] HMR update received!')
    indicator.textContent = 'CRX WebSocket HMR Updated'
    indicator.style.background = '#2196F3'
  })
}

export {}
