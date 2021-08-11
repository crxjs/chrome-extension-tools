import { bgCheckStream } from './messages'
// import { tabIds } from './storage'

bgCheckStream.subscribe(async ([, , respond]) => {
  respond(undefined)
  // chrome.runtime.openOptionsPage()
})
