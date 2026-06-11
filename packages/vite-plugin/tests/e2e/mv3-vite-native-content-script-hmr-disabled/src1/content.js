const text = 'one'

export function render() {
  let app = document.querySelector('#native-hmr-app')
  if (!app) {
    app = document.createElement('div')
    app.id = 'native-hmr-app'
    document.body.append(app)
  }
  app.textContent = text
}

render()

if (import.meta.hot) {
  import.meta.hot.accept((mod) => mod?.render())
}
