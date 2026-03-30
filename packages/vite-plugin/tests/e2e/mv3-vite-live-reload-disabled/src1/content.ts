const app = document.createElement('div')
app.id = 'app'
app.innerHTML = `<h1>Hello from content script</h1>`
document.body.append(app)

chrome.runtime.sendMessage({ type: 'content-script-load' })

export {}
