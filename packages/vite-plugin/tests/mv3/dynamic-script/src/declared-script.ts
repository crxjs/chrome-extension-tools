import fileName from './main-world?script&module'

console.log('declared script')

const script = document.createElement('script')
script.src = chrome.runtime.getURL(fileName)
script.type = 'module'
document.head.prepend(script)
