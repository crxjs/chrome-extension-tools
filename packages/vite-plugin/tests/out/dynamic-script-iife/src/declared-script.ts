import fileName from './main-world?script&iife'

console.log('declared script')

const script = document.createElement('script')
script.src = chrome.runtime.getURL(fileName)
script.defer = true
document.head.prepend(script)
