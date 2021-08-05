import { x } from '../shared/imported'
import path from 'path'

console.log(x)

console.log('service_worker.js')

chrome.storage.local.clear()

const joined = path.join('a', 'b')

console.log('joined', joined)
