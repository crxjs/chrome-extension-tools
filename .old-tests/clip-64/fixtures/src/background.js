import { listenTo } from '@bumble/stream'
import { notifyCopy, clipboard } from '@bumble/clipboard'

const id = 'clip-64'
const title = 'Clip65: Decode to Clipboard'
const contexts = ['selection']

chrome.contextMenus.create({ id, title, contexts })

listenTo(chrome.contextMenus.onClicked)
  .filter(({ menuItemId }) => menuItemId === id)
  .map(({ selectionText }) => {
    const decoded = atob(selectionText)
    console.log('Decoded:', atob(selectionText))
    return decoded
  })
  .await(clipboard.writeText)
  .await(notifyCopy)
  .catch(err => {
    console.error(err)
  })
