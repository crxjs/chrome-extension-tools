// Third content script
const marker3 = document.createElement('div')
marker3.id = 'crx-content-script-3'
marker3.textContent = 'Content script 3 loaded'
document.body.appendChild(marker3)

console.log('content3.ts loaded')

export {}
