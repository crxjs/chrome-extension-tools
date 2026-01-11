// Minimal content script for testing
console.log('CRXJS content script loaded')

const div = document.createElement('div')
div.id = 'crxjs-test'
div.textContent = 'CRXJS Extension Active'
document.body.appendChild(div)
