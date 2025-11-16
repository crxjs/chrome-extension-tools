import { mount } from 'svelte'
import App from './App.svelte'

const html = `<div id="crx-app"></div>`
const target = new DOMParser().parseFromString(html, 'text/html').body
  .firstElementChild
document.body.append(target)

const app = mount(App, { target })

export default app
