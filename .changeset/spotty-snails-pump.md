---
"@crxjs/vite-plugin": patch
---

Sometimes during development, an extension page may open before the service worker has a chance to control fetch. The HTML file will load from the file system, but the script tag might load from the dev server. This PR adds a precontroller loader plugin to the dev server so that the extension page will reload and the fetch handler will get the real HTML file from the server.
