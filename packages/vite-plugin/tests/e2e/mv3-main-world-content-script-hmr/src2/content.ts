// @ts-expect-error virtual module provided by CRX during dev serve
import { HMRPort } from '/@crx/client-port'

declare global {
  interface Window {
    crxMainWorldHmrMessage?: string
    crxMainWorldReconnectAfterChromeMutation?: () => boolean
  }
}

export const message = 'MAIN world HMR after update'

const root =
  document.querySelector<HTMLDivElement>('#crx-main-world-hmr') ??
  document.createElement('div')

root.id = 'crx-main-world-hmr'
if (!root.parentElement) document.body.append(root)

function render(value: string) {
  window.crxMainWorldHmrMessage = value
  root.textContent = value
}

render(message)

window.crxMainWorldReconnectAfterChromeMutation = () => {
  const hmrPort = new HMRPort()
  try {
    hmrPort.initPort()
    hmrPort.send(JSON.stringify({ type: 'connected' }))
    return true
  } finally {
    ;(hmrPort as unknown as { port?: chrome.runtime.Port }).port?.disconnect()
  }
}

if (import.meta.hot) {
  import.meta.hot.accept((mod) => {
    if (mod) render(mod.message)
  })
}
