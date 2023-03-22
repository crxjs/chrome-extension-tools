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

import Intro from '../\_dev-basics-intro.md';

import Installing from '../\_install-extension.md';

# Development Basics with React

<Intro/>


## Opening the extension

<Opening/>

![image](https://user-images.githubusercontent.com/33419526/227034773-c8b065eb-a3b4-4ab2-a31e-86a29bec7894.png)

## Profit with Vite HMR

Once you've found the extension icon, right-click it and choose "Inspect popup
window". This will open the popup and the popup dev tools window. We need to
inspect the popup to keep it open while making changes.

![Chrome Extension icon context menu](./assets/start-context-menu-inspect.png)

And boom! HMR magic at work.

![image](https://user-images.githubusercontent.com/33419526/227035247-c1956251-847a-4361-8e2f-dd323c9d7c67.png)
