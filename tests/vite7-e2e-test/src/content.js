console.log('[CRXJS Vite7 E2E] Content script loaded!')

const div = document.createElement('div')
div.id = 'crxjs-vite7-test'
div.textContent = 'CRXJS Vite7 E2E Test'
div.style.cssText = 'position: fixed; top: 10px; right: 10px; padding: 10px; background: #4CAF50; color: white; z-index: 99999; border-radius: 5px;'
document.body.appendChild(div)
