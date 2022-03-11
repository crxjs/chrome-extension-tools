import './style.css'
import { header } from './header'

const app = document.createElement('div')
app.id = 'app'
app.innerHTML = `
  <h1>${header}</h1>
  <a href="https://vitejs.dev/guide/features.html" target="_blank">Documentation</a>
`
document.body.append(app)
