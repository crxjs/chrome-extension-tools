/* eslint-env webextensions */
import io from 'socket.io-client/dist/socket.io'
import { PORT } from './CONSTANTS'

const socket = io(`http://localhost:${PORT}`)

socket.on('connect', () =>
  console.log('auto-reloader watching for changes...'),
)

socket.on('reload', () => {
  console.log('reloading')
  chrome.runtime.reload()
})
