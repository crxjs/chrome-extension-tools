import React from 'react'
import ReactDOM from 'react-dom'
import { Two } from './two.jsx'

const root = document.createElement('div')
root.id = 'two-root'
document.body.appendChild(root)

ReactDOM.render(<Two />, root)
