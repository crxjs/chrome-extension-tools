import { createComponent } from 'solid-js'
import { render } from 'solid-js/web'
import App from './views/App.tsx'

console.log('[CRXJS] Hello world from content script!')

/**
 * Mount the Solid app to the DOM.
 */
function mountApp() {
  const container = document.createElement('div')
  container.id = 'crxjs-app'
  document.body.appendChild(container)
  render(() => createComponent(App, {}), container)
}

mountApp()
