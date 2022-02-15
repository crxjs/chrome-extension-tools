import { sendBgCheck, bgOkStream, optOkStream } from './messages'

console.log('content script')

function addItem(message: string, error = false): void {
  const div = document.createElement('h1')
  div.innerText = message
  if (error) div.style.color = 'red'
  document.body.prepend(div)
}

addItem('Content script loaded')

sendBgCheck(undefined)
  .then(() => {
    addItem('Background response')
  })
  .catch(() => {
    addItem('Background did not respond', true)
  })

bgOkStream.subscribe(() => {
  addItem('Background OK')
})

optOkStream.subscribe(() => {
  addItem('Options page OK')
})
