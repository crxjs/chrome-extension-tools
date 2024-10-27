---
id: create-project
title: Create a project
description: Get started with Vue in a Chrome Extension popup page.
tags:
  - Getting started
  - Vue
  - Vite config
pagination_prev: null
slug: create-project
---

import {CreateProjectTabs} from '../\_create-project-tabs.mdx'

# Get Started with Vue

This quick guide will get you up and running with a Chrome Extension popup page.
You'll see how to integrate CRXJS with Vite, then explore Vite HMR in an
extension Vue HTML page. The first two sections take about 90 seconds!

<CreateProjectTabs projectType="vue"/>

:::tip package.json

Check `package.json` to ensure that `"type": "module"` is set. If this package
key is missing, Vite might not be able to build `vite.config.ts`.

:::

## Update the Vite config

Update `vite.config.js` to match the code below.

```js title=vite.config.js
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
// highlight-start
import { crx } from '@crxjs/vite-plugin'
import manifest from './manifest.json' // Node 14 & 16
import manifest from './manifest.json' assert { type: 'json' } // Node >=17
// highlight-end

export default defineConfig({
  plugins: [
    vue(),
    // highlight-next-line
    crx({ manifest }),
  ],
})
```

Create a file named `manifest.json` next to `vite.config.js`.

```json title=manifest.json
{
  "manifest_version": 3,
  "name": "CRXJS Vue Vite Example",
  "version": "1.0.0",
  "action": { "default_popup": "index.html" }
}
```

## First development build

Time to run the dev command. 🤞

```sh
npm run dev
```

That's it! CRXJS will do the rest.

Your project directory should look like this:

![RPCE File Structure](./assets/start-initial-files.png)

Next, we'll load the extension in the browser and give the development build a
test run.
