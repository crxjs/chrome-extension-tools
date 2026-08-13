// Simple content script with no imports or exports.
// Chrome injects this directly — it should NOT appear in web_accessible_resources.
var marker = document.createElement('div')
marker.id = 'crx-simple-content-script'
marker.textContent = 'Simple content script loaded'
document.body.appendChild(marker)
