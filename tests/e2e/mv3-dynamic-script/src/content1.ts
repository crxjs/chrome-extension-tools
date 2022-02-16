import fileName from './main-world?script&main'

const url = chrome.runtime.getURL(fileName)

console.log('content.ts')
console.log('main world script url', url)

const script = document.createElement('script')
script.src = url
document.body.append(script)

chrome.runtime.sendMessage({ type: 'ok' })
