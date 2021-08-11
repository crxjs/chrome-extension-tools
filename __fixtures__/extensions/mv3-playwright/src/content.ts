import { sendBgCheck, bgOkStream, optOkStream } from './messages'

console.log('content script')

function addItem(message: string, error = false): void {
  console.log('🚀 ~ addItem ~ message', message)
  const div = document.createElement('div')
  div.innerText = message
  if (error) div.style.color = 'red'
  document.body.append(div)
}

sendBgCheck(undefined)
  .then(() => {
    addItem('Content script loaded')
  })
  .catch(() => {
    addItem('Content script unable to load', true)
  })

bgOkStream.subscribe(() => {
  addItem('Background OK')
})

optOkStream.subscribe(() => {
  addItem('Options page OK')
})
