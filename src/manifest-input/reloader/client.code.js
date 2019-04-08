/* eslint-env webextensions */
import io from 'socket.io-client/dist/socket.io'
import { PORT } from './CONSTANTS'

if (
  typeof process === 'undefined' ||
  (process.env && process.env.NODE_ENV !== 'test')
) {
  const socket = io(`http://localhost:${PORT}`)

  socket.on('connect', () =>
    console.log('auto-reloader watching for changes...'),
  )

  socket.on('reload', () => {
    chrome.runtime.reload()
  })
}
