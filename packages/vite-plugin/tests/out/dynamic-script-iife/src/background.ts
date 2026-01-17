import scriptFileName from './dynamic-script?script'

console.log('background.ts')

chrome.action.onClicked.addListener((tab) => {
  if (tab.id)
    chrome.scripting.executeScript({
      files: [scriptFileName],
      target: { tabId: tab.id },
    })
})
