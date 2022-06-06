---
position: 3
title: 'Content Scripts'
---

# Content Scripts

CRXJS provides content scripts with Vite HMR, so updates don't always require a
full host page reload. In addition, frameworks like React and Vue work in
content scripts the same as HTML pages.

:::tip Host Pages

The host page of a content script is the website where the content script is
running.

:::

## Static Assets

Feel free to import static assets! CRXJS automatically declares imported content
script dependencies as `web_accessible_resources` in the manifest.

## Use the extension URL

Content scripts share the origin of the host page, so convert imported static
assets to the extension origin using the Chrome API.

```javascript
import logo from './logo.png'
const url = chrome.runtime.getURL(logo)
```

## HTML in content scripts

It is possible to inject an extension page into a host page using an iframe. The
host page CSP does not affect the inject iframe even if the host page specifies
the `frame-src` policy.

An injected extension page loads inside a cross-origin iframe, so it does not
have access to the host page DOM like a content script.

```javascript title=content-script.js
const src = chrome.runtime.getURL('pages/iframe.html')

const iframe = new DOMParser().parseFromString(
  `<iframe class="crx" src="${src}"></iframe>`,
).body.firstElementChild

document.body.append(iframe)
```

Injected extension pages do have access to the full Chrome API, however.

:::info Configuration required

If you load an HTML file from a content script, you need to declare the file as
a web-accessible resource.

```json
{
  "web_accessible_resources": [
    {
      "resources": ["pages/iframe.html"],
      "matches": ["https://*.google.com/*"]
    }
  ]
}
```

You will also need to add the HTML file to your Vite config under
`build.rollupOptions.input`.

```javascript title=vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        welcome: 'pages/iframe.html',
      },
    },
  },
})
```

:::

### Imported HTML

If you need to render complex HTML in a content script without a framework, an
HTML file can serve as a static fragment by importing it as text using the
`?raw` query. This technique does not require the file to be web-accessible, and
you don't need to declare it in the Vite config.

```javascript
import html from './root.html?raw'

const iframe = new DOMParser().parseFromString(html).body.firstElementChild
iframe.src = chrome.runtime.getURL('pages/iframe.html')

document.body.append(iframe)
```

Importing an HTML file as text lets you take advantage of IDE language services
for HTML files. Depending on your HTML, this technique may be more concise than
using `document.createElement()`.
