---
id: add-content-script
title: Add a content script
description: Add a React content script to an existing project
tags:
  - Content script
  - React
# could point this to a TypeScript manifest guide
pagination_next: null
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

## Get the right URL

:::info

<!-- Add link to Chrome Dev Docs -->

Content scripts share the origin of the page where they run.

:::

The browser treats the imported value `logo` as a URL from the host page. If the
content script is running on `https://google.com`, the following `img` tag will
try to load from `https://google.com/logo.svg`.

```jsx title=src/App.jsx
<img
  // highlight-next-line
  src={logo}
  className='App-logo'
  alt='logo'
/>
```

We need to get a URL with our extension id for static assets like images. Use
the `getURL()` method to get the extension url for our logo:

```jsx title=src/App.jsx
<img
  // highlight-next-line
  src={chrome.runtime.getURL(logo)}
  className='App-logo'
  alt='logo'
/>
```

Now our content script is ready for action!

## Profit with HMR

Make sure that your extension is loaded in the browser and that you've started
Vite. Navigate to `https://www.google.com` and scroll to the bottom of the page.
There's our familiar Vite Hello World!

Notice how the counter button doesn't look like a button. That's because
Google's styles affect our content script elements. The same goes the other way:
our styles change Google's styles.

Let's fix that button. Replace everything in `src/index.css` with this:

```css
#crx-root {
  position: fixed;
  top: 3rem;
  left: 50%;
  transform: translate(-50%, 0);
}

#crx-root button {
  background-color: rgb(239, 239, 239);
  border-color: rgb(118, 118, 118);
  border-image: initial;
  border-style: outset;
  border-width: 2px;
  margin: 0;
  padding: 1px 6px;
}
```

CRXJS will quickly rebuild the content script, and our CSS changes will take
effect. Now our `div` position is fixed, and that button looks more like a
button!

<!-- TODO: add more detailed instructions -->

Click the count button and play around with `src/App.jsx` to see Vite HMR at
work.
