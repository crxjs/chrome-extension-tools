import {
  bgCheckStream,
  optOkStream,
  sendBgOk,
  sendOptOk,
} from './messages'
// import { tabIds } from './storage'

bgCheckStream.subscribe(async ([, { tab }, respond]) => {
  const { id } = tab!

  respond({ id })
  sendBgOk(undefined, { tabId: id })

  optOkStream.subscribe(() => {
    sendOptOk(undefined, { tabId: id })
  })

  chrome.runtime.openOptionsPage()
})
