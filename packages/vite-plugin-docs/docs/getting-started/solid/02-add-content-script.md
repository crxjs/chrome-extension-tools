---
id: add-content-script
title: Add a content script
description: Add a Solid content script to an existing project
tags:
  - Content script
  - Solid
---

import DefineContentScript from '../\_define-content-script.md'

# Solid Content Scripts

CRXJS brings an authentic Vite HMR experience to content scripts. Let's add a
Solid content script to your Chrome Extension.

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
      "js": ["src/content.jsx"],
      "matches": ["https://www.google.com/*"]
    }
  ]
}
```

Here we're telling Chrome to execute `src/content.jsx` on all pages that start
with `https://www.google.com`.

## Create the root element

Content scripts don't use an HTML file, so we need to create our root element
and append it to the DOM before mounting our Solid app.

```jsx title=src/index.jsx
import { render } from 'solid-js/web';

import './index.css';
import App from './App';

render(
  () => <App />,
  // highlight-start
  // this element doesn't exist
  document.getElementById('root')
  // highlight-end
);
```

Let's add that root element. Make a copy of `src/index.jsx` and name it
`src/content.jsx`. Add the highlighted code.

```jsx title=src/content.jsx
import { render } from 'solid-js/web';

import './index.css';
import App from './App';

// highlight-start
const root = document.createElement('div')
root.id = 'crx-root'
document.body.append(root)
// highlight-end

render(
  () => <App />,
  // highlight-next-line
  root
);
```

import GetUrlForImages from '@site/docs/common/\_get-url-for-images.mdx'

<GetUrlForImages framework="solid"/>
