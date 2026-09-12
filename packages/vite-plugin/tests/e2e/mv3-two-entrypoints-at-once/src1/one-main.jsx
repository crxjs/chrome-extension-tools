import React from 'react'
import ReactDOM from 'react-dom'
import { One } from './one.jsx'

const root = document.createElement('div')
root.id = 'one-root'
document.body.appendChild(root)

ReactDOM.render(<One />, root)
