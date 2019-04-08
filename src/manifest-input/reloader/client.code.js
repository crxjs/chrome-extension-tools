/* eslint-env webextensions */
import io from 'socket.io-client/dist/socket.io'
import { PORT } from './CONSTANTS'

const socket = io(`http://localhost:${PORT}`)

socket.on('connect', () =>
  console.log('auto-reloading active. watching for changes...'),
)

socket.on('reload', () => {
  chrome.runtime.reload()
})
