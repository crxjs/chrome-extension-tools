import { render } from 'react-dom'
import App from './App'

console.log('content script')

const root = document.createElement('div')
root.id = 'root'
document.body.append(root)

render(<App />, root)
