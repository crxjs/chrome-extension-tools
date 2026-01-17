// Background script - registers IIFE content script for main-world injection
declare const self: ServiceWorkerGlobalScope
export {}

import mainWorldScript from './main-world?iife'

console.log('[CRXJS] Background script loaded')
console.log('[CRXJS] Registering main-world script:', mainWorldScript)

const script: chrome.scripting.RegisteredContentScript = {
  id: 'main-world-script',
  js: [mainWorldScript],
  matches: ['<all_urls>'],
  world: 'MAIN',
  runAt: 'document_start',
}

async function registerScript() {
  // Check if script already exists (for hot reload scenarios)
  const existing = await chrome.scripting.getRegisteredContentScripts({
    ids: [script.id],
  })
  if (existing.length) {
    await chrome.scripting.updateContentScripts([script])
    console.log('[CRXJS] Updated main-world content script')
  } else {
    await chrome.scripting.registerContentScripts([script])
    console.log('[CRXJS] Registered main-world content script')
  }
}

registerScript()
