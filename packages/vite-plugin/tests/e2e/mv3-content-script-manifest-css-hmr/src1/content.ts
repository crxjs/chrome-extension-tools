// Content script that adds a marker element to verify it ran
const marker = document.createElement('div')
marker.id = 'crx-content-script-loaded'
marker.textContent = 'Content script loaded'
document.body.appendChild(marker)

console.log('content.ts loaded - manifest CSS HMR test')

export {}
