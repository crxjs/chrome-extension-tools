import { createApp } from 'vue'
import App from './App.vue'

export function onExecute({ shadowRoot }: ContentScriptAPI.ExecuteFnOptions) {
  if (!shadowRoot) {
    console.error('shadowRoot is not available')
    return
  }
  const mount = document.createElement('div')
  mount.id = 'app'
  shadowRoot.appendChild(mount)
  createApp(App).mount(mount)
}
