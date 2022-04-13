// this should open a new tab
setTimeout(() => {
  const url = chrome.runtime.getURL('src/sandbox.html')
  chrome.tabs.create({ url })
}, 1000)
export {}
