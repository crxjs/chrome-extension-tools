import fileName from './dynamic-script?script'

console.log('content script')

const script = document.createElement('script')
script.src = chrome.runtime.getURL(fileName)
document.head.prepend(script)
