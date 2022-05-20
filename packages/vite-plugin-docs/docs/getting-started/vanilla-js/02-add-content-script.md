---
id: add-content-script
title: Add a content script
description: Add a vanilla JS content script to an existing project
tags:
  - Content script
  - JavaScript
  - vanilla
pagination_next: null
---

import DefineContentScript from '../\_define-content-script.md'

CRXJS brings an authentic Vite HMR experience to content scripts. Let's add a
plain JavaScript content script to your Chrome Extension.

<DefineContentScript/>

## Declare a content script

We declare content scripts in the manifest with a list of JavaScript files and
match patterns. Match patterns represent the pages where Chrome should execute
our content script. In `manifest.json`, create the field `content_scripts` with
an array of objects:

```json title=manifest.json
{
  // other fields...
  "content_scripts": [
    {
      "js": ["src/content.js"],
      "matches": ["https://www.google.com/*"]
    }
  ]
}
```

Here we're telling Chrome to execute `src/content.js` on all pages that start
with `https://www.google.com`. In this case, the Google homepage is the content
script's host page.

## Add an visual element

We're not using a framework, but we can use plain JavaScript to add the
[CRXJS logo](./assets/image.png) to a host page. Notice how Vite still allows
you to import CSS files and static assets even though you're not using a
framework!

```javascript title=src/content.js
import src from './image.png'
import './content.css'

const html = `
<div class="crx">
  <img src=${src}>
</div>
`

const doc = new DOMParser().parseFromString(html, 'text/html')
document.body.append(doc.body.firstElementChild)
```

```css title=src/content.css
.crx img {
  width: 3rem;
  height: 3rem;
}
```

## Get the right URL

Content scripts share the origin of their host page. We need to get a URL with
our extension id for static assets like images. Let's go to `src/content.js` and
do that now.

```html title="An imported asset path won't work"
<img src="${src}" />
```

```html title="Use chrome.runtime.getURL() to get the right url"
<img src="${chrome.runtime.getURL(src)}" />
```

Now our content script is ready for action!
