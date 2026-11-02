import { answer as expectedAnswer } from './shared.js'

chrome.runtime
  .sendMessage({ type: 'firefox-e2e', source: 'content' })
  .then(async ({ answer }) => {
    const { source } = await chrome.storage.local.get('source')
    if (answer === expectedAnswer) {
      document.body.dataset.crxjsFirefox = `${answer}:${source}`
    }
  })
