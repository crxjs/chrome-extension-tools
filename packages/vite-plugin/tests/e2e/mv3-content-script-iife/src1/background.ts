// @ts-ignore - dynamic script import
import dynamicRegularSrc from './content-dynamic.ts?script'
// @ts-ignore - dynamic script import  
import dynamicIifeSrc from './content-dynamic-iife.iife.ts?script'

// Also exercise the bare `?iife` query alias on a normal-named file,
// alongside the `.iife.ts` filename convention in the same project.
import dynamicIifeBareSrc from './content-dynamic.ts?iife'

console.log('Background loaded')
console.log('Dynamic regular script path:', dynamicRegularSrc)
console.log('Dynamic IIFE script path:', dynamicIifeSrc)
console.log('Dynamic IIFE (bare ?iife alias) script path:', dynamicIifeBareSrc)

chrome.runtime.onInstalled.addListener(async () => {
  // Register dynamic content scripts
  await chrome.scripting.registerContentScripts([
    {
      id: 'dynamic-regular',
      matches: ['https://example.com/*'],
      js: [dynamicRegularSrc],
    },
    {
      id: 'dynamic-iife',
      matches: ['https://example.com/*'],
      js: [dynamicIifeSrc],
    },
  ])
  console.log('Dynamic content scripts registered')
})
