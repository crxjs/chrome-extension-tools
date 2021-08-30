// IDEA: could use Rollup API to bundle this file
//  - that would probably be overkill

export const code = `
// This is a MOCK bundle from ${__filename}
// BUNDLE IMPORTS STUB

const eventPaths = /*@__PURE__*/JSON.parse('%EVENTS%')
const importPath = /*@__PURE__*/JSON.parse('%PATH%')
const delayLength = /*@__PURE__*/JSON.parse('%DELAY%')
const excludedPaths = /*@__PURE__*/JSON.parse('%EXCLUDE%')

import(chrome.runtime.getURL(importPath))
`.trim()
