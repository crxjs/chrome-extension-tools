declare global {
  interface Window {
    crxMainWorldHmrMessage?: string
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

if (import.meta.hot) {
  import.meta.hot.accept((mod) => {
    if (mod) render(mod.message)
  })
}
