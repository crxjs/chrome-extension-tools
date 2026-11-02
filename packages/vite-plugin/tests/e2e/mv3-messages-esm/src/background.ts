// This fixes `self`'s type.
declare const self: ServiceWorkerGlobalScope
export {}

import { bgCheckStream, sendBgOk } from './messages'

console.log('service worker')

const openOptionsPage = (): Promise<void> =>
  new Promise<void>((resolve, reject) => {
    chrome.runtime.openOptionsPage(() => {
      if (chrome.runtime.lastError)
        reject(new Error(chrome.runtime.lastError.message))

      resolve()
    })
  })

bgCheckStream.subscribe(async ([, { tab }, respond]) => {
  const { id } = tab!
  respond({ id })
  await sendBgOk(undefined, { tabId: id })

  await new Promise<void>((resolve, reject) => {
    chrome.storage.local.set({ tabIds: { id } }, () => {
      if (chrome.runtime.lastError)
        reject(new Error(chrome.runtime.lastError.message))
      else resolve()
    })
  })
  await openOptionsPage()
})
