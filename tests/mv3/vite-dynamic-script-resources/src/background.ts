import content1 from './content1.ts?script'
import content2 from './content2.ts?script'

chrome.scripting.executeScript({
  files: [content1, content2],
  target: { tabId: 1 },
})
