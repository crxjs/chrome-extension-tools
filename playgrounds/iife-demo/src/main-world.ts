// This script runs in the MAIN world - it has access to the page's JavaScript context!
// Unlike regular content scripts that run in an isolated world, this can:
// - Access window.* variables set by the page
// - Call functions defined by the page
// - Intercept/modify page behavior

console.log('[CRXJS IIFE] Running in MAIN world!')
console.log(
  '[CRXJS IIFE] window object is the real page2112313 window:',
  window.location.href,
)

// Example: Add a visible indicator that the script is running
function addIndicator() {
  const indicator = document.createElement('div')
  indicator.id = 'crxjs-iife-indicator'
  indicator.innerHTML = `
    <div style="
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
      z-index: 999999;
      cursor: pointer;
      transition: transform 0.2s, box-shadow 0.2s;
    " onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
      <strong>Hello crxjs community</strong><br>
      <small>Running in MAIN world</small>
    </div>
  `
  indicator.onclick = () => {
    alert(
      "This script has access to the page's JavaScript context!\n\nwindow.location: " +
        window.location.href,
    )
  }
  document.body.appendChild(indicator)
}

// Wait for DOM to be ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', addIndicator)
} else {
  addIndicator()
}

// Example: Intercept fetch (only possible in MAIN world!)
const originalFetch = window.fetch
window.fetch = async function (...args) {
  console.log('[CRXJS IIFE] Intercepted fetch:', args[0])
  return originalFetch.apply(this, args)
}

console.log(
  '[CRXJS IIFE] Fetch interceptor installed - try making a fetch request!',
)

export {}
// test change 1768659751
