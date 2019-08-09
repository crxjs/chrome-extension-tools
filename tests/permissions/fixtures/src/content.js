console.log('content.js')

import chromep from 'chrome-promise'
import { storage } from '@bumble/storage'
import { openDownload } from './downloads'

openDownload()

chrome.bookmarks.onChanged(() => {
  console.log('you changed a bookmark')
})

chromep.alarms.getAll()

storage.set({ test: null })
