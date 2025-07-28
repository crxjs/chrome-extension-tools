import React from 'react'
import { render } from 'react-dom'
import App from './App'

console.log('popup script')

const root = document.querySelector('#root')

render(<App />, root)
