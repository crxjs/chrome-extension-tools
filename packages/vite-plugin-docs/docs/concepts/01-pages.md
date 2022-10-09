---
position: 1
title: HTML Pages
---

# Extension Pages

CRXJS provides extension HTML pages with Vite HMR during development and
optimizations in a production build. The manifest can declare the most common
pages, such as the action popup and the options page, but not every extension
page has a place in the manifest.

## Extra HTML pages

If you need to declare extra HTML pages beyond those the manifest accommodates,
place them in the Vite config under `build.rollupOptions.input`.

This example includes a welcome page to open when the user installs the
extension.

```javascript title=vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        welcome: 'pages/welcome.html',
      },
    },
  },
})
```

Vite will serve these input pages during development and include an optimized
version of them in the production build.
