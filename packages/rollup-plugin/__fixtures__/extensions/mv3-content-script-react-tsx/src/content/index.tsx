import React from 'react'
import { render } from 'react-dom'

console.log('content script')

const root = document.createElement('div')
root.id = 'root'
document.body.append(root)

render(<h1>Hello World!</h1>, root)
