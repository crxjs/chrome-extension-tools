/* eslint-env webextensions */
import io from 'socket.io-client/dist/socket.io'

import { PORT } from './CONSTANTS'

const socket = io(`http://localhost:${PORT}`)

socket.on('connect', () =>
  console.log(
    `DEVELOPMENT build with web socket auto-reloader.
Loaded on ${new Date().toTimeString()}.`.trim(),
  ),
)

socket.on('reload', () => {
  console.log('Reloading now...')

  setTimeout(() => {
    chrome.runtime.reload()
  }, 500)
})
