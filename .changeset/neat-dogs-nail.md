---
"@crxjs/vite-plugin": patch
---

Check for manifest assets first in the project root, then check in the public dir. Throw an informative error if the file does not exist in either dir.
