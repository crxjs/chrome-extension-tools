declare const __MAIN_MODULE__: string
declare const __CRX_HMR_TOKEN__: string

// This loader runs in the isolated world. The module element runs in MAIN,
// with an extension URL as its base for imports. No extension API is exposed.
if (__CRX_HMR_TOKEN__) {
  const channel = `@crx/main:${__CRX_HMR_TOKEN__}`
  const key = Symbol.for(channel)
  const scope = globalThis as typeof globalThis & Record<symbol, boolean>
  if (!scope[key]) {
    scope[key] = true
    const port = chrome.runtime.connect({
      name: `@crx/client:${__CRX_HMR_TOKEN__}`,
    })
    let connected = false
    port.onMessage.addListener((message) => {
      if (JSON.parse(message.data).type === 'connected') connected = true
      window.postMessage({ channel, data: message.data }, '*')
    })
    // A late module subscriber still needs the initial connected notification.
    // Only this handshake is accepted; page code cannot send runtime messages.
    window.addEventListener('message', (event) => {
      if (
        event.source === window &&
        event.data?.channel === channel &&
        event.data?.ready === true &&
        connected
      ) {
        window.postMessage(
          { channel, data: JSON.stringify({ type: 'connected' }) },
          '*',
        )
      }
    })
  }
}

const script = document.createElement('script')
script.type = 'module'
script.src = `${chrome.runtime.getURL(__MAIN_MODULE__)}?execute=${crypto
  .getRandomValues(new Uint32Array(2))
  .join('-')}`
script.addEventListener('load', () => script.remove(), { once: true })
script.addEventListener(
  'error',
  () => {
    console.error('[crx] MAIN world module failed to load', script.src)
    script.remove()
  },
  { once: true },
)
;(document.head || document.documentElement).append(script)

export {}
