// First content script
const marker1 = document.createElement('div')
marker1.id = 'crx-content-script-1'
marker1.textContent = 'Content script 1 loaded'
document.body.appendChild(marker1)

console.log('content1.ts loaded')

export {}
