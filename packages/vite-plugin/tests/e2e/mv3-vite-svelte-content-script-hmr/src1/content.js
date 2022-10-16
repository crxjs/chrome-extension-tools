import App from './App.svelte'

const html = `<div id="crx-app"></div>`
const target = new DOMParser().parseFromString(html, 'text/html').body
  .firstElementChild
document.body.append(target)

const app = new App({ target })

export default app
