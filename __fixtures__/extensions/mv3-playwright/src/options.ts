import { sendOptOk } from './messages'
// import { tabIds } from './storage'

// const { id } = await tabIds.get('id')
const id = 2

const h1 = document.createElement('h1')
h1.innerText = `Tab id: ${id}`
document.body.append(h1)

sendOptOk(undefined, { tabId: id })
