import { sendOptOk } from './messages'

const h1 = document.createElement('h1')
h1.innerText = 'Options script'
document.body.append(h1)

sendOptOk(undefined)
