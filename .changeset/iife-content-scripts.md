---
'@crxjs/vite-plugin': minor
---

feat: add IIFE support for main-world content scripts

Add support for IIFE content scripts via the `?iife` import query, enabling
main-world script injection using `chrome.scripting.registerContentScripts` with
`world: 'MAIN'`.

Usage:

```typescript
import mainWorld from './main-world?iife'

chrome.scripting.registerContentScripts([
  {
    id: 'main-world',
    js: [mainWorld],
    matches: ['<all_urls>'],
    world: 'MAIN',
  },
])
```

- IIFE scripts are bundled separately using Rollup
- Dev mode: file changes trigger rebuild + extension reload
- TypeScript support via `client.d.ts` module declaration

Closes #1101
