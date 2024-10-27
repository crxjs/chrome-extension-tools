---
id: add-content-script
title: Add a content script
description: Add a Vue content script to an existing project
tags:
  - Content script
  - Vue
---

import DefineContentScript from '../\_define-content-script.md'

# Vue Content Scripts

CRXJS brings an authentic Vite HMR experience to content scripts. Let's add a
Vue content script to your Chrome Extension.

<DefineContentScript/>

## Add a content script

We declare content scripts with a list of JavaScript files and match patterns
for the pages where Chrome should execute our content script. In
`manifest.json`, create the field `content_scripts` with an array of objects:

```json title="manifest.json"
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
with `https://www.google.com`.

## Create the root element

Content scripts don't use an HTML file, so we need to create our root element
and append it to the DOM before mounting our Vue app.


```js title=src/main.js
import { createApp } from 'vue'
import './style.css'
import App from './App.vue'

const app = createApp(App)
// highlight-start
// this element doesn't exist
app.mount('#app')
// highlight-end
```

Let's add that root element. Make a copy of `src/main.js` and name it
`src/content.js`. Add the highlighted code.

```js title=src/content.js
import { createApp } from 'vue'
import App from './App.vue'

// highlight-start
const root = document.createElement('div')
root.id = 'crx-root'
document.body.append(root)
// highlight-end

const app = createApp(App)
// highlight-next-line
app.mount(root)

```

import GetUrlForImages from '@site/docs/common/\_get-url-for-images.mdx'

<GetUrlForImages framework="vue"/>

Now our content script is ready for action! Let's try it out in the next
section.
