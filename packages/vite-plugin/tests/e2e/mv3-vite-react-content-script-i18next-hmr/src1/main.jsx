import React from 'react'
import ReactDOM from 'react-dom'
import App from './App'

const root = document.createElement('div')
root.id = 'root'
document.body.appendChild(root)

ReactDOM.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
  root,
)
