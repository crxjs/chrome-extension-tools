console.log('content.ts')

const container = document.createElement('div')
container.classList.add('container')
const script = document.createElement('script')
script.src = chrome.runtime.getURL('src/script.ts.js')
document.body.append(container, script)

export {}
