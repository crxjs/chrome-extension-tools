// Second content script
const marker2 = document.createElement('div')
marker2.id = 'crx-content-script-2'
marker2.textContent = 'Content script 2 loaded'
document.body.appendChild(marker2)

console.log('content2.ts loaded')

export {}
