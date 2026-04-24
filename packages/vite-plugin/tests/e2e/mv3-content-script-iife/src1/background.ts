// @ts-ignore - dynamic script import
import dynamicRegularSrc from './content-dynamic.ts?script'
// @ts-ignore - dynamic script import  
import dynamicIifeSrc from './content-dynamic-iife.iife.ts?script'

console.log('Background loaded')
console.log('Dynamic regular script path:', dynamicRegularSrc)
console.log('Dynamic IIFE script path:', dynamicIifeSrc)

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
