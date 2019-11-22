import { contextMenu, message } from '@bumble/chrome'
import { listenTo, log } from '@bumble/stream'
import { notifyCopy, clipboard } from '@bumble/clipboard'

const id = 'Clip-selector'
const title = 'Clip-selector'
const contexts = [
  'page',
  'frame',
  'link',
  'editable',
  'image',
  'video',
  'audio',
]

contextMenu.create({ id, title, contexts })

listenTo(chrome.contextMenus.onClicked)
  .filter(({ menuItemId }) => menuItemId === id)
  .map((info, [, { id }]) => ({
    tabId: id,
    greeting: 'get-selector',
  }))
  .forEach(log('toMessage.send'))
  .await(message.sendToTab)
  .map(({ selector }) => selector)
  .await(clipboard.writeText)
  .await(notifyCopy)
  .catch(err => {
    console.error(err)
  })
