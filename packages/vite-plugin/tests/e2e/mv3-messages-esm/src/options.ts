import { sendOptOk } from './messages'

// The background persists the tab ID before opening this page.
chrome.storage.local.get('tabIds', ({ tabIds }) => {
  if (chrome.runtime.lastError)
    throw new Error(chrome.runtime.lastError.message)

  const { id } = tabIds as { id: number }
  const h1 = document.createElement('h1')
  h1.innerText = `${id}`
  document.body.append(h1)

  sendOptOk(undefined, { tabId: id })
})
