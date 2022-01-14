import fileName from './main-world?script'

console.log('content.ts', fileName)

const script = document.createElement('script')
script.src = chrome.runtime.getURL(fileName)
document.body.append(script)

chrome.runtime.sendMessage({ type: 'ok' })
