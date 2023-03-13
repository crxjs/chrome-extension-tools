import { a } from './a'

const root = new DOMParser().parseFromString(
  `<div id="root">${a}<p>root-0</p></div>`,
  'text/html',
).body.firstElementChild as HTMLDivElement

document.body.append(root)
