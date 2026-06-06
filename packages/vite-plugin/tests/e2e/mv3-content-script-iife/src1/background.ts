import dynamicRegularSrc from './content-dynamic.ts?script'
import dynamicIifeSrc from './content-dynamic-iife.iife.ts?script'

// Exercise the bare `?iife` query alias on a normal-named file
// (distinct file to avoid type conflict with ?script on the same module).
// This is the "via query string" edge case for forcing IIFE on a normal filename
// for a dynamically registered content script.
import bareIifeAliasSrc from './normal-iife-alias.ts?iife'
import { dynamicBareIifeAliasId, dynamicIifeId, dynamicRegularId } from './script-ids'

console.log('Background loaded')
console.log('Dynamic regular script path:', dynamicRegularSrc)
console.log('Dynamic IIFE script path:', dynamicIifeSrc)
console.log('Dynamic bare ?iife alias script path:', bareIifeAliasSrc)

// Register immediately at top level (onInstalled does not reliably fire
// for test-loaded extensions in persistent context; see other dynamic tests).
chrome.scripting
  .registerContentScripts([
    {
      id: dynamicRegularId,
      matches: ['https://example.com/*'],
      js: [dynamicRegularSrc],
    },
    {
      id: dynamicIifeId,
      matches: ['https://example.com/*'],
      js: [dynamicIifeSrc],
    },
    {
      id: dynamicBareIifeAliasId,
      matches: ['https://example.com/*'],
      js: [bareIifeAliasSrc],
    },
  ])
  .then(() => console.log('Dynamic content scripts registered'))
  .catch(console.error)
