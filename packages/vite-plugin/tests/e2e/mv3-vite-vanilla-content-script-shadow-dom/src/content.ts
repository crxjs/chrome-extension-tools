import './style.css'

export function onExecute({ shadowRoot }: ContentScriptAPI.ExecuteFnOptions) {
  if (!shadowRoot) {
    console.error('shadowRoot is not available')
    return
  }

  const app = document.createElement('div')
  app.id = 'crx-app'
  app.innerHTML = `
    <h1>Shadow DOM Content</h1>
    <p>This content is inside the shadow DOM</p>
  `
  shadowRoot.appendChild(app)
}
