---
id: add-content-script
title: Add a content script
description: Add a React content script to an existing project
tags:
  - Content script
  - React
---

import DefineContentScript from '../\_define-content-script.md'

# React Content Scripts

CRXJS brings an authentic Vite HMR experience to content scripts. Let's add a
React content script to your Chrome Extension.

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
and append it to the DOM before mounting our React app.

:::info

<!-- Look for React v18 implementation for newer projects -->

Vite now defaults to React v18 which uses ReactDOM.createRoot instead of previous ReactDOM.render
https://reactjs.org/blog/2022/03/29/react-v18.html

:::

```jsx title=src/main.jsx
import React from 'react'
import ReactDOM from 'react-dom'
import './index.css'
import App from './App'

ReactDOM.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
  // highlight-start
  // this element doesn't exist
  document.getElementById('root'),
  // highlight-end
)
```

### Implementation for React 18+

```jsx title=src/main.jsx
import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from './App'

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
     <App />
  </React.StrictMode>
);
```

Let's add that root element. Make a copy of `src/main.jsx` and name it
`src/content.jsx`. Add the highlighted code.

```jsx title=src/content.jsx
import React from 'react'
import ReactDOM from 'react-dom'
import './index.css'
import App from './App'

// highlight-start
const root = document.createElement('div')
root.id = 'crx-root'
document.body.append(root)
// highlight-end

ReactDOM.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
  // highlight-next-line
  root,
)
```

### Implementation for React 18+

```jsx title=src/content.jsx
import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";

// highlight-start
const root = document.createElement("div");
root.id = "crx-root";
document.body.appendChild(root);
// highlight-end

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

import GetUrlForImages from '@site/docs/common/\_get-url-for-images.mdx'

<GetUrlForImages framework="react"/>

Now our content script is ready for action! Let's try it out in the next
section.
