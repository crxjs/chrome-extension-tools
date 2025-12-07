---
"@crxjs/vite-plugin": minor
---

* adds support for main world content scripts declared from manifest
* shows warning during development for detected main world scripts so that the dev is not surprised the hmr does not work for it
* does not touch `chrome.scripting.registerContentScripts` scripts, as they already work
