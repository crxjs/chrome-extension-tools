import './foo'
import './static-data'

const listener = () => undefined
Object.assign(globalThis, { __messageListener: listener })
chrome.runtime.onMessage.addListener(listener)
