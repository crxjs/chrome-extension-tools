import App from './App.svelte'

const html = `<div id="root"></div>`
const target = new DOMParser().parseFromString(html).body.firstElementChild
document.body.append(target)

const app = new App({ target })

export default app
