import text from './inline-script?script&text'

console.log('content script')

const script = document.createElement('script')
script.text = text
document.head.prepend(script)
