import { a } from './a'
import { b } from './b'

const root = new DOMParser().parseFromString(
  `<div id="root">${JSON.stringify(a === b)}</div>`,
  'text/html',
).body.firstElementChild as HTMLDivElement

document.body.append(root)
