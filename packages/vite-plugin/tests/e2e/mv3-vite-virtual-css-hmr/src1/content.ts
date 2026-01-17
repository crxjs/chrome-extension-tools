import 'virtual:uno.css'

const app = document.createElement('div')
app.id = 'app'
app.className = 'text-red'
app.innerHTML = `
  <h1>Hello World</h1>
`
document.body.append(app)

chrome.runtime.sendMessage({ type: 'content-script-load' })
