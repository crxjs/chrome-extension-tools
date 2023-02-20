import { a } from './a'

const root = new DOMParser().parseFromString(
  `<div id="root">${a}</div>`,
  'text/html',
).body.firstElementChild as HTMLDivElement

document.body.append(root)
