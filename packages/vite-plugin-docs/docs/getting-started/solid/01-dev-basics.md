---
id: dev-basics
title: Development basics
description: Basic development workflow with Vite, Solid, and CRXJS.
tags:
  - HTML page
  - Popup page
  - Solid
  - Vite config
slug: dev-basics
---

import Intro from '../\_dev-basics-intro.md';

import Installing from '../\_install-extension.md';

# Development Basics with Solid

<Intro/>

## Install the extension

<Installing/>

![Chrome Extension icon context menu](./assets/start-context-menu-inspect.png)

## Profit with Vite HMR

Once you've found the extension icon, right-click it and choose "Inspect popup
window". This will open the popup and the popup dev tools window. We need to
inspect the popup to keep it open while making changes.

![Popup without min-width](./assets/start-starter-narrow.png)

That popup is pretty tiny; let's add some CSS to make it wider.

```css title=App.module.css
.App {
  text-align: center;
  // highlight-next-line
  min-width: 350px;
}
```

And boom! HMR magic at work.

![Popup with min-width](./assets/start-starter-wide.png)
