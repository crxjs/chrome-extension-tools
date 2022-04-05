import fileName from './main-world?script&module'

const url = chrome.runtime.getURL(fileName)

console.log('content2.ts', { fileName, url })

const script = document.createElement('script')
script.src = url
script.type = 'module'
document.body.append(script)

chrome.runtime.sendMessage({ type: 'ok' })
