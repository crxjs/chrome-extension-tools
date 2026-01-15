// This content script runs in the MAIN world
// It should be able to access and modify page variables directly

// Set a test variable in the page's global scope
;(window as any).testWorldMain = 'running in MAIN world'

// Create a visible element to verify the script loaded
const testContainer = document.createElement('div')
testContainer.id = 'world-main-test-container'
testContainer.style.cssText =
  'position: fixed; top: 10px; right: 10px; z-index: 9999; background: lime; padding: 10px; border: 2px solid green;'
testContainer.textContent = 'Content Script World: MAIN'

document.body.appendChild(testContainer)

console.log(
  'Content script running in MAIN world - can access page globals:',
  typeof window,
)

export {}
