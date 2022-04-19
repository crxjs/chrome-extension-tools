import { x } from '../shared/imported'
import path from 'path'

console.log(x)

console.log('background.js')

chrome.storage.local.clear()

const joined = path.join('a', 'b')

console.log('joined', joined)
