<p align="center">
  <a href="https://github.com/extend-chrome/rollup-plugin-chrome-extension" rel="noopener">
  <!-- TODO: add new logo image -->
  <img width=200px height=200px src="https://imgur.com/wEXnCYK.png" alt="rollup-plugin-chrome-extension logo"></a>
</p>

<h3 align="center">rollup-plugin-chrome-extension</h3>

<div align="center">

[![npm (scoped)](https://img.shields.io/npm/v/rollup-plugin-chrome-extension.svg?style=for-the-badge&logo=npm)](https://www.npmjs.com/package/rollup-plugin-chrome-extension)
[![GitHub last commit](https://img.shields.io/github/last-commit/extend-chrome/rollup-plugin-chrome-extension.svg?style=for-the-badge&logo=github)](https://github.com/extend-chrome/rollup-plugin-chrome-extension)
[![CircleCI](https://img.shields.io/circleci/build/github/extend-chrome/rollup-plugin-chrome-extension?token=31f554b1e0c742c0ed5ccab825000c78e65791ba&style=for-the-badge&logo=circleci)](https://circleci.com/gh/extend-chrome/rollup-plugin-chrome-extension)
[![Codecov](https://img.shields.io/codecov/c/github/extend-chrome/rollup-plugin-chrome-extension?style=for-the-badge&logo=codecov)](https://codecov.io/gh/extend-chrome/rollup-plugin-chrome-extension)
[![TypeScript Declarations Included](https://img.shields.io/badge/types-TypeScript-informational?style=for-the-badge&logo=typescript)](#typescript)

</div>

<div align="center">

[![Chrome Extension Tutorials on YouTube](https://img.shields.io/badge/Chrome%20Extension%20Tutorials-YouTube-c4302b.svg?style=for-the-badge&logo=youtube)](https://www.youtube.com/channel/UCVj3dGw75v8aHFYD6CL1tFg)
[![ko-fi](https://img.shields.io/badge/Buy%20us%20a%20tea-ko--fi-29ABE0?style=for-the-badge&logo=ko-fi)](https://ko-fi.com/jacksteam)

</div>

---

A feature-rich solution for bundled Chrome extensions! 💯

Build Chrome extensions using
[Rollup](https://rollupjs.org/guide/en/), with
[minimal configuration](#usage).

Use `manifest.json` as the input. Every file in the manifest will
be bundled or copied to the output folder.

## Table of Contents

- [Getting Started](#getting_started)
- [Usage](#usage)
- [Features](#features)
- [API Documentation](https://github.com/extend-chrome/rollup-plugin-chrome-extension/blob/master/API.md)

## Getting started <a name = "getting_started"></a>

### Chrome Extension Boilerplates

We have TypeScript and JavaScript boilerplates available.

Get started fast with the
[JavaScript React boilerplate](https://github.com/extend-chrome/js-react-boilerplate):

```
git clone https://github.com/extend-chrome/js-react-boilerplate.git
```

Or use the [TypeScript React boilerplate](https://github.com/extend-chrome/ts-react-boilerplate) if you're feeling
fancy:

```
git clone https://github.com/extend-chrome/ts-react-boilerplate.git
```

Special thanks to [@kyrelldixon](https://www.kyrelldixon.com/) for this [Svelte and Tailwind CSS boilerplate with optional TypeScript support](https://github.com/kyrelldixon/svelte-tailwind-extension-boilerplate):

```
git clone https://github.com/kyrelldixon/svelte-tailwind-extension-boilerplate.git
```

### I want to do it myself

```sh
$ npm i rollup rollup-plugin-chrome-extension@latest -D
```

Install the plugins
[Node Resolve](https://www.npmjs.com/package/@rollup/plugin-node-resolve)
and [CommonJS](https://github.com/rollup/@rollup/plugin-commonjs)
if you plan to use npm modules.

```sh
$ npm i @rollup/plugin-node-resolve @rollup/plugin-commonjs -D
```

## Usage <a name = "usage"></a>

Create a `rollup.config.js` file in your project root.

```javascript
// rollup.config.js

import resolve from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'

import {
  chromeExtension,
  simpleReloader,
} from 'rollup-plugin-chrome-extension'

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
    commonjs(),
  ],
}
```

Add these scripts to your `package.json` file.

```jsonc
// package.json

{
  "scripts": {
    "build": "rollup -c",
    "start": "rollup -c -w"
  }
}
```

Put your Chrome extension source code in a folder named `src` in
the root of your project and build with the following command:

```sh
$ npm run build
```

Your extension build will be in the `dist` folder. It has
everything it needs: manifest, scripts, and assets (images, css,
etc...).

Load it in Chrome `chrome://extensions/` to test drive your
extension! 🚗

## Features <a name = "features"></a>

### ⭐️ It's all in the Manifest <a name = "features-manifest"></a>

<div style="padding-left: 30px; padding-bottom: 10px;">

<details>
<summary>Why does the `rollup.config.js` only need the manifest as an entry point?</summary>
<br>
`rollup-plugin-chrome-extension` parses your manifest and bundles 
the scripts in your background page, content scripts, option page and popup page
</details>

<details>
<summary>Does that include the scripts in the Options page and Popup page?</summary>
<br>
`rollup-plugin-chrome-extension` uses the JS or even TS files in
your HTML files as entry points. Shared code is split out into
chunks automatically, so libraries like React and Lodash aren't
bundled into your extension multiple times.
</details>

<details>
<summary>What happens with the assets? Like images, icons or css files?</summary>
<br>
All assets in the manifest (images, icons, and even CSS files) are 
automatically copied into the output folder. Even the images in your HTML 
files get copied over.
NOTE: This only includes assets in the html itself. 
If you import images or CSS in a JavaScript file, you will need an 
additional plugin. 
</details>

<details>
<summary>Is the Manifest validated?</summary>
<br>
`rollup-plugin-chrome-extension` validates your output manifest, 
so you discover mistakes when you build, not in a cryptic Chrome
alert later.
</details>

<details>
<summary>Does it detect permissions automatically?</summary>
<br>
`rollup-plugin-chrome-extension` statically analyzes your bundled
code, detects any required permissions and adds them to the manifest 
in the `dist` folder. Any permissions in the source manifest are always 
included.
</details>

<details>
<summary>Do I have to copy/paste the package.json fields to the Manifest?</summary>
<br>
You can omit `manifest_version`, `version`, `name`, and
`description` from your source `manifest.json`. We'll fill them
out automatically from your `package.json`, if you use an npm
script to run Rollup. Just manage your version number in
`package.json` and it will reflect in your extension build.

Don't worry, any value in your source manifest will take over! 😉

</details>

</div>

### ⭐️ Reload Your Extension Automatically <a name = "features-reloader"></a>

<div style="padding-left: 30px; padding-bottom: 10px;">

<details>
<summary>Does this mean I don't have to manually reload my extension during development?</summary>
<br>
Improve your development experience with our reloader!
You won't have to reload your Chrome extension every time you make a change
to your code. We know what a pain it can be to forget and wonder, 
"Why isn't this change working? 😟". 
</details>

<details>
<summary>Does it also reload the pages I am injecting content scripts?</summary>
<br>
Ever got the error `"Extension context invalidated"` in your
content script? That happens when the extension reloads but the
content script doesn't. Our reloader makes sure that doesn't
happen by reloading your content scripts when it reloads your
extension automatically.
</details>

<details>
<summary>How do I enable the reloader?</summary>
<br>
If you include the helper plugin `simpleReloader` in your config,
when Rollup is in watch mode your background page will include an
auto-reloader script. This will reload your extension every time
Rollup produces a new build.
</details>

</div>

### ⭐️ Write Chrome Extensions In TypeScript <a name = "typescript"></a>

#### Includes Chrome extension API types

If you use the
[`@rollup/plugin-typescript`](https://www.npmjs.com/package/@rollup/plugin-typescript),
you can write your Chrome extension in TypeScript. That's right,
it bundles the scripts in your manifest and in your HTML script
tags.

TypeScript definitions are included, so no need to install an
additional `@types` library!

---

### ⭐️ Use ES2015 Modules In Your Scripts <a name = "features-modules"></a>

Chrome extensions don't support modules in background and content
scripts. We've developed a
[module loader](#dynamic-import-wrapper) specifically for Chrome
extension scripts, so you can take advantage of Rollup's great
code splitting features.

---

### ⭐️ Use Promises like it's 2021 <a name = "features-browser-polyfill"></a>

Add the excellent [promisified Browser API polyfill](https://github.com/mozilla/webextension-polyfill) by Mozilla to your
Chrome extension with one easy option:

```javascript
chromeExtension({ browserPolyfill: true })
```

This option adds `browser` to the global scope, so you don't need to import anything.

[Install this type package](https://www.npmjs.com/package/@types/firefox-webext-browser) to get Intellisense. It's automatically updated on a regular basis.

---

### ⭐️ Plugins Take It To The Next Level <a name = "plugins"></a>

Take advantage of other great Rollup plugins to do awesome things
with your Chrome extensions!

Some of our favorites are:

- Write your extension in TS with
  [`@rollup/plugin-typescript`](https://www.npmjs.com/package/@rollup/plugin-typescript)
- Import CSS in JS files with
  [`rollup-plugin-postcss`](https://www.npmjs.com/package/rollup-plugin-postcss)
- Zip your extension when you build with
  [`rollup-plugin-zip`](https://www.npmjs.com/package/rollup-plugin-zip).
- Copy any assets not included in the manifest.json
  [`rollup-plugin-copy`](https://github.com/vladshcherbin/rollup-plugin-copy).

Two of our own plugins:

- Import a module as a string of code to use in
  `chrome.runtime.executeScript` with
  [`rollup-plugin-bundle-imports`](https://www.npmjs.com/package/rollup-plugin-bundle-imports)
- Empty your output folder before a new build with
  [`rollup-plugin-empty-dir`](https://www.npmjs.com/package/rollup-plugin-empty-dir)

### ⭐️ Outputs a Chrome Web Store friendly bundle <a name = ""></a>

<!-- START TUFD -->

Every time you publish your Chrome extension to the Web Store,
your extension will be reviewed by a robot and then a human to
make sure it meets their guidelines. Even if you pass when you
first publish, your extension may be flagged at any time.
`rollup-plugin-chrome-extension` helps you put your best foot
forward.

Wrong permissions are the number one reason that Chrome
extensions are rejected from the Chrome Web Store.
`rollup-plugin-chrome-extension` can detect most of the commonly
used permissions in your code automatically, so you only need to
add a permission manually if you absolutely know that you need
it.

Imagine the person who reviews the code you submit. Common
bundling options like webpack and Parcel produce code that is
really hard to read. Rollup produces code that is easy to read!
When you submit your extension for review, you want to avoid
misunderstandings.

Rollup produces a nice clean bundle using code splitting, ES
modules, and tree-shaking. If you don't use some piece of code,
Rollup removes it. If you use a module in more than once place,
Rollup splits it out into a chunk, so that it's only in your
extension once.

All of this means a smaller Chrome extension. We've seen Chrome
extensions go from over 8Mb to less than 1Mb just by switching
from `create-react-app` to Rollup. A smaller bundle means less
code to review, and less room for error during the review
process.

<!-- END TUFD -->
