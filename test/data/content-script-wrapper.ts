// IDEA: could use Rollup API to bundle this file
//  - that would probably be overkill

export const code = `
// This is a MOCK bundle from helpers/bundle-imports-stub.ts
// BUNDLE IMPORTS STUB

const importPath = /*@__PURE__*/JSON.parse('%PATH%')

import(chrome.runtime.getURL(importPath))
`.trim()
