chrome.runtime
  .sendMessage({ type: 'firefox-e2e', source: 'popup' })
  .then(async ({ answer }) => {
    const { source } = await chrome.storage.local.get('source')
    document.querySelector('#result').textContent = `${answer}:${source}`
  })
