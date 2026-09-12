// This fixes `self`'s type.
declare const self: ServiceWorkerGlobalScope
export {}

import filePath from './main-world?iife'

// Also exercise the `.iife.ts` filename convention in the same test that uses the bare `?iife` query.
import conventionFilePath from './main-world-convention.iife.ts?script'

console.log('IIFE via bare ?iife:', filePath)
console.log('IIFE via .iife.ts?script convention:', conventionFilePath)

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
