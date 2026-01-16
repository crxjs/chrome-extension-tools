import fileName from './main-world?script&iife'

const url = chrome.runtime.getURL(fileName)

console.log('content2.ts', { fileName, url })

const script = document.createElement('script')
script.src = url
script.defer = true
document.body.append(script)

chrome.runtime.sendMessage({ type: 'ok' })
