// This fixes `self`'s type.
declare const self: ServiceWorkerGlobalScope
export {}

import filePath from './main-world?iife'

const script: chrome.scripting.RegisteredContentScript = {
  id: 'main-world-script',
  matches: ['<all_urls>'],
  js: [filePath],
  runAt: 'document_start',
  world: 'MAIN',
}

async function registerScript() {
  const existing = await chrome.scripting.getRegisteredContentScripts({
    ids: [script.id],
  })
  if (existing.length) {
    await chrome.scripting.updateContentScripts([script])
  } else {
    await chrome.scripting.registerContentScripts([script])
  }
}

registerScript()
