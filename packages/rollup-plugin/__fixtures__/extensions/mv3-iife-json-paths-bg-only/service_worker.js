import { x } from './imported'

console.log(x)

console.log('service_worker.js')

chrome.storage.local.clear()
