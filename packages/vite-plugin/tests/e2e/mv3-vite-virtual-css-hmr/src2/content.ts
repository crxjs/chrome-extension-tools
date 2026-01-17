import 'virtual:uno.css'

const app = document.createElement('div')
app.id = 'app'
app.className = 'text-green mt-4'
app.innerHTML = `
  <h1>Updated Hello World</h1>
`
document.body.append(app)

chrome.runtime.sendMessage({ type: 'content-script-load' })
