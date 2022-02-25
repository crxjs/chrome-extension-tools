import type { HMRPayload } from 'vite'

let port: chrome.runtime.Port
setupPort()
setInterval(() => port?.postMessage({ type: 'ping' }), 5000)
setInterval(setupPort, 5 * 60 * 1000)

// periodically reconnect and poll the background to keep it awake
function setupPort() {
  port?.disconnect()
  port = chrome.runtime.connect({ name: '@crx/client' })
  port.postMessage({ type: 'connected', url: import.meta.url })
  port.onMessage.addListener(handlePortMessage)
}

function handlePortMessage(payload: HMRPayload | { type: 'ping' }) {
  switch (payload.type) {
    case 'connected':
      console.log('[vite-crx] connected.')
      break
    case 'custom':
      if (payload.event === 'runtime-reload') handleRuntimeReload()
      break
    default:
      console.log('[vite]', payload)
      break
  }
}

function handleRuntimeReload() {
  console.log('[vite-crx] runtime reload.')
  setTimeout(() => location.reload(), 1000)
}

console.log('import.meta.hot', import.meta.hot)

export function createHotContext() {
  console.log('createHotContext')
}
export function updateStyle() {
  console.log('updateStyle')
}
export function removeStyle() {
  console.log('removeStyle')
}
