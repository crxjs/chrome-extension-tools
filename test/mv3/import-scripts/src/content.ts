import text from './dynamic-script?script&esm'

console.log('content script')

const script = document.createElement('script')
script.text = text
document.head.prepend(script)
