import interceptorSrc from './interceptor.iife.ts?script'
import { dynamicNetworkScriptId } from './script-ids'

const script: chrome.scripting.RegisteredContentScript = {
  id: dynamicNetworkScriptId,
  matches: ['https://example.com/*'],
  js: [interceptorSrc],
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

registerScript().catch(console.error)
