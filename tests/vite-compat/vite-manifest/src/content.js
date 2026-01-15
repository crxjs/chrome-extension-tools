console.log('[CRXJS] Content script loaded!')

const div = document.createElement('div')
div.id = 'crxjs-test'
div.textContent = 'CRXJS Test'
div.style.cssText =
  'position: fixed; top: 10px; right: 10px; padding: 10px; background: #4CAF50; color: white; z-index: 99999; border-radius: 5px;'
document.body.appendChild(div)
