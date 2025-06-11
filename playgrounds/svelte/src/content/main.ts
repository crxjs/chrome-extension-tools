import { mount } from 'svelte'
import App from './views/App.svelte'

console.log('[CRXJS] Hello world from content script!')

/**
 * Mount the Svelte app to the DOM.
 */
function mountApp() {
  const container = document.createElement('div')
  container.id = 'crxjs-app'
  document.body.appendChild(container)
  mount(App, {
    target: container,
  })
}

mountApp()
