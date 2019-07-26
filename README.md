<!--
Template tags:
bumble-org
rollup-plugin-chrome-extension
https://imgur.com/wEXnCYK.png
-->

<p align="center">
  <a href="https: //github.com/bumble-org/rollup-plugin-chrome-extension" rel="noopener">
  <img width=200px height=200px src="https://imgur.com/wEXnCYK.png" alt="rollup-plugin-chrome-extension logo"></a>
</p>

<h3 align="center">rollup-plugin-chrome-extension</h3>

<p align="center">
<div align="center">

[![npm (scoped)](https://img.shields.io/npm/v/rollup-plugin-chrome-extension.svg)](https://www.npmjs.com/package/rollup-plugin-chrome-extension)
[![GitHub last commit](https://img.shields.io/github/last-commit/bumble-org/rollup-plugin-chrome-extension.svg)](https://github.com/bumble-org/rollup-plugin-chrome-extension)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](/LICENSE)
[![TypeScript Declarations Included](https://img.shields.io/badge/types-TypeScript-informational)](#typescript)

</div>
</p>

<p align="center">
<div align="center">

[![Fiverr: We make Chrome extensions](https://img.shields.io/badge/Fiverr%20-We%20make%20Chrome%20extensions-brightgreen.svg)](https://www.fiverr.com/jacksteam)
[![ko-fi](https://img.shields.io/badge/ko--fi-Buy%20me%20a%20coffee-ff5d5b)](https://ko-fi.com/K3K1QNTF)

</div>
</p>

---

A feature-rich solution for bundled Chrome extensions! 💯

Build Chrome extensions using [Rollup](https://rollupjs.org/guide/en/), with [minimal configuration](#usage).

Use `manifest.json` as the input. Every file in the manifest will be bundled or copied to the output folder.

## Table of Contents

- [Getting Started](#getting_started)
- [Usage](#usage)
- [Features](#features)
- [Options API](#options)

## Getting started <a name = "getting_started"></a>

### Installation

```sh
$ npm i rollup-plugin-chrome-extension -D
```

## Usage <a name = "usage"></a>

```sh
$ npm i rollup rollup-plugin-node-resolve rollup-plugin-commonjs rollup-plugin-chrome-extension -D
```

```javascript
// rollup.config.json
import { rollup } from 'rollup'
import resolve from 'rollup-plugin-node-resolve'
import commonjs from 'rollup-plugin-commonjs'

import { chromeExtension } from 'rollup-plugin-chrome-extension'

export default {
  input: 'src/manifest.json',
  output: {
    dir: 'dist',
    format: 'esm',
  },
  // always put chromeExtension() before other plugins
  plugins: [chromeExtension(), resolve(), commonjs()],
}
```

```json
// package.json
{
  "scripts": {
    "build": "rollup -c",
    "watch": "rollup -c -w"
  }
}
```

## Features <a name = "features"></a>

### Derive Permissions Automatically <a name = "features-permissions"></a>

`rollup-plugin-chrome-extension` statically analyzes your bundled code to detect required permissions to declare in the manifest. Any permissions in the source manifest are always included. If a permission is added [that you don't want](#options-permissions), just add it to the source manifest and prefix it with `!` (for example, `"!alarms"`). We'll leave it out.

### Reload Your Extension Automatically <a name = "features-reloader"></a>

When Rollup is in watch mode, `rollup-plugin-chrome-extension` bundles an automatic reloader into your extension. This feature will reload your extension when Rollup produces a new build. You can view the [options here](#options-reloader), or read more about the [reloaders here](#reloaders). The only time you may need to manually reload is when you first start a watch session.

### Worry Less About Your Manifest <a name = ""></a>

You can omit `manifest_version`, `version`, `name`, and `description` from your source `manifest.json`. We'll fill them out automatically from your `package.json`, if you use an npm script to run Rollup.

Don't worry, any value in your manifest will override that value from `package.json`! 😉

### Use ES2015 Modules In Your Scripts <a name = "features-modules"></a>

Chrome extensions don't support modules in background and content scripts. We've developed a [module loader](#dynamic-import-wrapper) specifically for Chrome extension scripts, so you can take advantage of Rollup's great code splitting features.

### TypeScript Definitions <a name = "typescript"></a>

TypeScript definitions are included, so no need to install an additional `@types` library!

## Options API <a name = "options"></a>

[assets](#options-assets) |
[dynamicImportWrapper](#options-dynamic-import-wrapper) |
[entries](#options-entries) |
[permissions](#options-permissions) |
[pkg](#options-pkg) |
[publicKey](#options-public-key) |
[reloader](#options-reloader)

`rollup-plugin-chrome-extension` works out of the box, but sometimes you need more. Just pass in an options object with any of the following properties. Everything is optional.

Some options use [glob patterns](https://www.npmjs.com/package/picomatch#basic-globbing) to define what files to include and exclude.

### `[assets]` <a name = "options-assets"></a>

Type: `{ include?: glob[], exclude?: glob[] }`

Specify files in `manifest.json` to include as assets.

```javascript
// Example usage
chromeExtension({
  assets: {
    // Only emit css files as assets
    include: ['**/*.css'],
    exclude: ['src/do-not-emit.css'],
  },
})

// Advanced usage
chromeExtension({
  entries: {
    // Bundle TypeScript files
    include: ['src/*.ts'],
  },
  assets: {
    // Copy plain JavaScript and PNG files
    include: ['src/*.js', 'src/images/*.png'],
  },
})

// Default value
chromeExtension({
  include: [
    '**/*.png',
    '**/*.jpg',
    '**/*.jpeg',
    '**/*.gif',
    '**/*.css',
  ],
})
```

### `[dynamicImportWrapper]` <a name = "options-dynamic-import-wrapper"></a>

Type: `object | false`

We use dynamic imports to support ES2015 modules and [code splitting](https://medium.com/rollup/rollup-now-has-code-splitting-and-we-need-your-help-46defd901c82) for JS files.

<!-- ARTICLE: write "modules in chrome extension" article -->

[Use modules in Chrome extension scripts](). Only disable if you know what you're doing, because code splitting won't work if `dynamicImportWrapper === false`.

#### `[dynamicImportWrapper.wakeEvents]`

Type: `string[]`

Events that wake (reactivate) an extension may be lost if that extension uses dynamic imports to load modules or asynchronously adds event listeners.

<!-- ARTICLE: write "wake events and module loading" article -->

List events that will wake your background page (for example, `'chrome.tabs.onUpdated'`, or `'chrome.runtime.onInstalled'`). The script module loader will defer them until after all the background script modules have fully loaded.

> It may be possible to statically analyze the background page code to detect which events the extension uses. Like [this issue]() if this is something that interests you!

```javascript
// Example usage
chromeExtension({
  dynamicImportWrapper: {
    wakeEvents: ['chrome.contextMenus.onClicked'],
  },
})

// Default value
chromeExtension({
  dynamicImportWrapper: {
    wakeEvents: [
      'chrome.runtime.onInstalled',
      'chrome.runtime.onMessage',
    ],
  },
})
```

#### `[dynamicImportWrapper.eventDelay]`

Type: `number | boolean`

Delay Event page wake events by `n` milliseconds after the all background page modules have finished loading. This may be useful for event listeners that are added asynchronously.

```javascript
chromeExtension({
  dynamicImportWrapper: {
    eventDelay: 50,
  },
})
```

### `[entries]` <a name = "options-entries"></a>

Type: `{ include?: glob[], exclude?: glob[] }`

Specify files in `manifest.json` to include as assets.

```javascript
// Example usage
chromeExtension({
  // Bundle only js files
  include: ['src/*.js'],
})

// You can use exclude by itself
chromeExtension({
  // `include` will be the default value
  exclude: ['src/no-bundle.js'],
})

// Default value
chromeExtension({
  include: ['**/*.js', '**/*.html', '**/*.ts'],
})
```

### `[permissions]` <a name = "options-permissions"></a>

Type: `{ include?: glob[], exclude?: glob[], verbose: boolean }`

Specify modules to statically analyze for [permissions](https://developer.chrome.com/extensions/declare_permissions) to include in `manifest.permissions`.

You may want to exclude a module file. Sometimes libraries check if a `chrome` property exists to detect if the environment is a Chrome extension. This can throw off static permissions analysis.

**I Need A Quick Fix**: If a permission is added that you don't want, just add it to the source manifest and prefix it with `"!"` (i.e., `"!alarms"`). We'll leave it out.

```javascript
// Example usage
chromeExtension({
  exclude: ['node_modules/some-lib'],
})

// Default value
chromeExtension({
  include: ['**/*'],
  verbose: true,
})
```

#### `[permissions.verbose]`

Type: `boolean`

Set to `false` to suppress "Derived permissions" message.

```javascript
// Example usage
chromeExtension({
  permissions: {
    verbose: false,
  },
})

// Default value
chromeExtension({
  permissions: {
    verbose: true,
  },
})
```

### `[pkg]` <a name = "options-pkg"></a>

Type: `object`

Only use this field if you will not run Rollup using npm scripts (for example, `$ npm run build`), since npm provides scripts with the package info as an environment variable.

The fields `name`, `description`, and `version` are used.

These values are used to derive certain values from the `package.json` for the extension manifest. A value set in the source `manifest.json` will override a value from `package.json`.

```javascript
// Example usage
const packageJson = require('./package.json')

chromeExtension({
  // Not needed if you use npm to run Rollup
  pkg: packageJson,
})

// Default value
chromeExtension({
  // Can be omitted if run using an npm script
})
```

### `[publicKey]` <a name = "options-public-key"></a>

Type: `string`

<!-- ARTICLE: how to get stable extension id -->

If truthy, `manifest.key` will be set to this value. Use this feature to [stabilize the extension id during development](https://stackoverflow.com/questions/31422195/keep-chrome-extension-id-same-during-development).

> Note that this value is not the actual id. An extension id is derived from this value.

```javascript
const p = process.env.NODE_ENV === 'production'

// Example usage
chromeExtension({
  publicKey: !p && 'mypublickey',
})

// Default value
chromeExtension({
  publicKey: undefined,
})
```

### `[reloader]` <a name = "options-reloader"></a>

Type: `'non-persistent' | 'persistent' | false`

Choose which reloader to use, or omit the [automatic reloader](#features-reloader) module from the extension build.

This option is only used when Rollup is in watch mode.

```javascript
// Example usage
chromeExtension({
  reloader: 'persistent',
})

// Default value
chromeExtension({
  reloader: 'non-persistent',
})
```

<!-- ARTICLE: What I Learned Designing a Chrome Extension Reloader -->

## Automatic Reloaders <a name = "reloaders"></a>

**TLDR;** The default reloader creates system notifications to let you know when the extension will reload. It uses [Firebase](https://firebase.google.com/) and creates an [anonymous account](https://firebase.google.com/docs/auth/web/anonymous-auth) to associate installs with the Rollup watch session. We don't keep any data about you after you exit Rollup.

> Make sure you do a production build before releasing to the Chrome Web Store! The reloader won't hurt anything, but there's no reason to include it.

There are two reloaders to choose from: a Push notification reloader that is compatible with [non-persistent background ~~Event~~ pages](https://developer.chrome.com/extensions/background_pages#manifest), or a simple interval based reloader that makes the background page persistent.

You should know that the Push reloader uses [Firebase Cloud Messaging](https://firebase.google.com/docs/cloud-messaging) to tell the extension when to reload. It creates an anonymous account for each Rollup watch session, which is deleted when Rollup exits that watch session. This is necessary to associate the extension installation with the watch session.

If you're not comfortable with anonymous accounts, or need to develop without an internet connection, you can [use the persistent reloader](#options-reloader). It's dead simple and just uses a timestamp file. It also works between watch sessions.

<!-- ARTICLE: ES2015 Modules and Chrome Extensions -->
<!-- ## Script Module Loader <a name = "module-loader"></a> -->
