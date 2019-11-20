console.log('background')

import { notify } from '@bumble/notify'
import chromep from 'chrome-promise'
import { openDownload } from './downloads'

// chunk support
openDownload()

// chrome support
chrome.contextMenus.onClicked(() => {
  console.log('you clicked a context menu')
})

// chromep support
chromep.cookies.getAll()

// library support
notify('from content.js').then(() => {
  console.log('you\'ve been notified')
})
