---
id: dev-basics
title: Development basics
description: Basic development workflow with Vite, React, and CRXJS.
tags:
  - HTML page
  - Popup page
  - React
  - Vite config
slug: dev-basics
---

import Intro from '../\_dev-basics-intro.md'

# Development Basics with React

<Intro/>

## Install the extension

When the build completes, open Chrome or Edge and navigate to
`chrome://extensions`. Make sure to turn on the developer mode switch.

| Chrome                                                                | Edge                                                              |
| --------------------------------------------------------------------- | ----------------------------------------------------------------- |
| ![Chrome developer mode switch](../assets/dev-mode-switch-chrome.png) | ![Edge developer mode switch](../assets/dev-mode-switch-edge.png) |
| Located in top right corner                                           | Located in left sidebar                                           |

Drag your `dist` folder into the Extensions Dashboard to install it. Your
extension icon will be in the top bar. The icon will be the first letter of the
extension's name.

<!-- TODO: update manifest with {name: CRXJS Vite React Example} -->

![Chrome Extension icon context menu](./assets/start-context-menu-inspect.png)

## Profit with Vite HMR

Once you've found the extension icon, right-click it and choose "Inspect popup
window". This will open the popup and the popup dev tools window. We need to
inspect the popup to keep it open while making changes.

![Popup without min-width](./assets/start-starter-narrow.png)

That popup is pretty tiny; let's add some CSS to make it wider.

```css title=App.css
.App {
  text-align: center;
  // highlight-next-line
  min-width: 350px;
}
```

And boom! HMR magic at work.

![Popup with min-width](./assets/start-starter-wide.png)
