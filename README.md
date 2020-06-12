<p align="center">
  <a href="https://github.com/extend-chrome/rollup-plugin-chrome-extension" rel="noopener">
  <!-- TODO: add new logo image -->
  <img width=200px height=200px src="https://imgur.com/wEXnCYK.png" alt="rollup-plugin-chrome-extension logo"></a>
</p>

<h3 align="center">rollup-plugin-chrome-extension</h3>

<div align="center">

[![npm (scoped)](https://img.shields.io/npm/v/rollup-plugin-chrome-extension.svg)](https://www.npmjs.com/package/rollup-plugin-chrome-extension)
[![GitHub last commit](https://img.shields.io/github/last-commit/extend-chrome/rollup-plugin-chrome-extension.svg)](https://github.com/extend-chrome/rollup-plugin-chrome-extension)
[![CircleCI](https://img.shields.io/circleci/build/github/extend-chrome/rollup-plugin-chrome-extension?token=31f554b1e0c742c0ed5ccab825000c78e65791ba)](https://circleci.com/gh/extend-chrome/rollup-plugin-chrome-extension)
[![Codecov](https://img.shields.io/codecov/c/github/extend-chrome/rollup-plugin-chrome-extension)](https://codecov.io/gh/extend-chrome/rollup-plugin-chrome-extension)
[![TypeScript Declarations Included](https://img.shields.io/badge/types-TypeScript-informational)](#typescript)

</div>

<div align="center">

[![Tutorials on YouTube: Tutorials](https://img.shields.io/badge/Tutorials-YouTube-c4302b.svg)](https://www.youtube.com/channel/UCVj3dGw75v8aHFYD6CL1tFg)
[![ko-fi](https://img.shields.io/badge/Buy%20us%20a%20tea-ko--fi-29ABE0)](https://ko-fi.com/jacksteam)

</div>

---

A feature-rich solution for bundled Chrome extensions! 💯

Build Chrome extensions using [Rollup](https://rollupjs.org/guide/en/), with [minimal configuration](#usage).

Use `manifest.json` as the input. Every file in the manifest will be bundled or copied to the output folder.

## Table of Contents

- [Getting Started](#getting_started)
- [Usage](#usage)
- [Features](#features)
- [API Documentation](https://github.com/extend-chrome/rollup-plugin-chrome-extension/blob/master/API.md)

## Getting started <a name = "getting_started"></a>

### Installation

```sh
$ npm i rollup rollup-plugin-chrome-extension@latest -D
```

Install the plugins [Node Resolve](https://www.npmjs.com/package/@rollup/plugin-node-resolve) and [CommonJS](https://github.com/rollup/@rollup/plugin-commonjs) if you plan to use npm modules.

```sh
$ npm i @rollup/plugin-node-resolve @rollup/plugin-commonjs -D
```

## Usage <a name = "usage"></a>

Create a `rollup.config.js` file in your project root.

```javascript
// rollup.config.js

import { rollup } from 'rollup'

import resolve from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'

import { chromeExtension, simpleReloader } from 'rollup-plugin-chrome-extension'

export default {
  input: 'src/manifest.json',
  output: {
    dir: 'dist',
    format: 'esm',
  },
  plugins: [
    // always put chromeExtension() before other plugins
    chromeExtension(),
    simpleReloader(),
    // the plugins below are optional
    resolve(),
    commonjs()
  ],
}
```

Add these scripts to your `package.json` file.

```jsonc
// package.json

{
  "scripts": {
    "build": "rollup -c",
    "watch": "rollup -c -w"
  }
}
```

Put your Chrome extension source code in a folder named `src` in the root of your project and build with the following command:

```sh
$ npm run build
```

Your extension build will be in the `dist` folder. It has everything it needs: manifest, scripts, and assets (images, css, etc...).

Install it in Chrome to test drive your extension! 🚗

## Features <a name = "features"></a>

### Worry Less About Your Manifest <a name = "features-manifest"></a>

`rollup-plugin-chrome-extension` validates your output manifest, so you discover mistakes when you build, not in a cryptic Chrome alert later.

You can omit `manifest_version`, `version`, `name`, and `description` from your source `manifest.json`. We'll fill them out automatically from your `package.json`, if you use an npm script to run Rollup. Just manage your version number in `package.json` and it will reflect in your extension build.

Don't worry, any value in your source manifest will override that value from `package.json`! 😉

### Reload Your Extension Automatically <a name = "features-reloader"></a>

Reloading your Chrome extension every time you change your code can be a pain, and if you forget to reload, you're left wondering, "Why isn't this working?"

If you've included the helper plugin `simpleReloader` in your config, when Rollup is in watch mode the it will include an auto-reloader script. This feature will reload your extension every time Rollup produces a new build.

<!-- You should know that `pushReloader` connects to Firebase to do its magic. [Get the details here.](#reloaders) The only time you may need to manually reload is when you first start a watch session. -->

Ever got the error `"Extension context invalidated"` in your content script? That happens when the extension reloads but the content script doesn't. Our reloader makes sure that doesn't happen by reloading your content scripts when it reloads your extension.

### Write Chrome Extensions In TypeScript <a name = "typescript"></a>

If you use [`@rollup/plugin-typescript`](https://www.npmjs.com/package/@rollup/plugin-typescript) in your plugins, you can write your Chrome extension in TypeScript. That's right, the scripts in your manifest and in your HTML script tags.

TypeScript definitions are included, so no need to install an additional `@types` library!

### Manage Your Assets With Ease <a name = "features-assets"></a>

Your `manifest.json` doesn't only contain script files. There are images, icons, and even CSS files. We've got you covered. These assets are automatically copied into the output folder. Even the images in your HTML files get copied over.

### Bundle Everything In Your HTML Files <a name = "features-html"></a>

What about your Options and Popup pages? `rollup-plugin-chrome-extension` uses the JS or even TS files in your HTML files as entry points. Shared code is split out into chunks automatically, so libraries like React and Lodash aren't bundled into your extension multiple times.

### Derive Permissions Automatically <a name = "features-permissions"></a>

`rollup-plugin-chrome-extension` statically analyzes your bundled code to detect required permissions to declare in the manifest. Any permissions in the source manifest are always included.

### Use ES2015 Modules In Your Scripts <a name = "features-modules"></a>

Chrome extensions don't support modules in background and content scripts. We've developed a [module loader](#dynamic-import-wrapper) specifically for Chrome extension scripts, so you can take advantage of Rollup's great code splitting features.

### Plugins Take It To The Next Level <a name = ""></a>

Take advantage of other great Rollup plugins to do awesome things with your Chrome extensions!

Some of our favorites are:

- Write your extension in TS with [`@rollup/plugin-typescript`](https://www.npmjs.com/package/@rollup/plugin-typescript)
- Import CSS in JS files with [`rollup-plugin-postcss`](https://www.npmjs.com/package/rollup-plugin-postcss)
- Zip your extension when you build with [`rollup-plugin-zip`](https://www.npmjs.com/package/rollup-plugin-zip).

Two of our own plugins:

- Import a module as a string of code to use in `chrome.runtime.executeScript` with [`rollup-plugin-bundle-imports`](https://www.npmjs.com/package/rollup-plugin-bundle-imports)
- Empty your output folder before a new build with [`rollup-plugin-empty-dir`](https://www.npmjs.com/package/rollup-plugin-empty-dir)

<!-- ARTICLE: What I Learned Designing a Chrome Extension Reloader -->

## Automatic Reloaders <a name = "reloaders"></a>

> The `pushReloader` currently does not work. Use the `simpleReloader` instead. See [this issue](https://github.com/extend-chrome/rollup-plugin-chrome-extension/issues/30) for more info. 

**TLDR;** The `pushReloader` plugin creates system notifications to let you know when the extension will reload. It uses [Firebase](https://firebase.google.com/) and creates an [anonymous account](https://firebase.google.com/docs/auth/web/anonymous-auth) to associate installs with the Rollup watch session. We don't keep any data about you after you exit Rollup.

> Make sure you do a production build before releasing to the Chrome Web Store! The reloader won't hurt anything, but there's no reason to include it.

There are two reloaders to choose from: a Push notification reloader that is compatible with [non-persistent background ~~Event~~ pages](https://developer.chrome.com/extensions/background_pages#manifest), or a simple reloader that makes the background page persistent.

You should know that the Push reloader uses [Firebase Cloud Messaging](https://firebase.google.com/docs/cloud-messaging) to tell the extension when to reload. It creates an anonymous account for each Rollup watch session, which is deleted when Rollup exits that watch session. This is necessary to associate the extension installation with the watch session.

If you're not comfortable with anonymous accounts, or need to develop without an internet connection, you can [use the simple reloader](https://github.com/extend-chrome/rollup-plugin-chrome-extension/blob/master/API.md#exports-simple-reloader). It just checks a timestamp file periodically. It also works between watch sessions.

<!-- ARTICLE: ES2015 Modules and Chrome Extensions -->
<!-- ## Script Module Loader <a name = "module-loader"></a> -->
