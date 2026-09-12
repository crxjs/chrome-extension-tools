import React from 'react'
import ReactDOM from 'react-dom'
import App from './App.jsx'

const root =
  document.querySelector('#crx-react-main-world-hmr-root') ??
  document.createElement('div')

root.id = 'crx-react-main-world-hmr-root'
if (!root.parentElement) document.body.append(root)

ReactDOM.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
  root,
)
