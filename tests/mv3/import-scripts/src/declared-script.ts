import fileName from './main-world?script'

console.log('declared script')

const script = document.createElement('script')
script.src = chrome.runtime.getURL(fileName)
document.head.prepend(script)
