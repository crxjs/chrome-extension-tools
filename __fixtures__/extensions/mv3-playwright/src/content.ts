import { sendBgCheck, bgOkStream, optOkStream } from './messages'

console.log('content script')

function addItem(message: string, error = false): void {
  console.log('🚀 ~ addItem ~ message', message)
  const div = document.createElement('div')
  div.innerText = message
  if (error) div.style.color = 'red'
  document.body.append(div)
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
