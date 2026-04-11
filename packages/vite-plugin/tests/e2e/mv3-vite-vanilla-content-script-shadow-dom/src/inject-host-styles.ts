// MAIN world script: injects aggressive host-page CSS that should NOT penetrate shadow DOM
function injectStyles() {
  const style = document.createElement('style')
  style.textContent = `
    h1 {
      color: rgb(0, 0, 255) !important;
      font-size: 48px !important;
      background: rgb(255, 255, 0) !important;
    }
    p {
      color: rgb(0, 0, 255) !important;
    }
  `
  ;(document.head || document.documentElement).appendChild(style)
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', injectStyles)
} else {
  injectStyles()
}

export {}
