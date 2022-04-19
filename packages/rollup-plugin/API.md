# API Documentation <a name = "api"></a>

`rollup-plugin-chrome-extension` works out of the box, but
sometimes you need more.

## Table of Contents

- [Exports](#exports)
  - [`chromeExtension`](#chromeextension)
  - [`simpleReloader`](#simplereloader)
- [Manifest](#manifest)
  - [permissions](#options-permissions)
- [Options](#options)
  - [browserPolyfill](#options-browser-polyfill)
  - [dynamicImportWrapper](#options-dynamic-import-wrapper)
  - [pkg](#options-pkg)
  - [publicKey](#options-public-key)

## Exports <a name = "exports"></a>

### `chromeExtension`

| Type       | Arguments                                     |
| ---------- | --------------------------------------------- |
| `function` | `(options?: object) => ChromeExtensionPlugin` |

Call this function to initialize
`rollup-plugin-chrome-extension`. Always put it first in the
plugins array, since it converts the manifest json file to an
array of input files. See [Options API](#options-api) for config
details.

```javascript
// rollup.config.js

import { chromeExtension } from 'rollup-plugin-chrome-extension'

export default {
  input: 'src/manifest.json',
  output: {
    dir: 'dist',
    format: 'esm',
  },
  plugins: [chromeExtension()],
}
```

### `simpleReloader`

| Type       | Call Signature                           |
| ---------- | ---------------------------------------- |
| `function` | `() => SimpleReloaderPlugin | undefined` |

This reloader simply uses `setInterval` to fetch a local
timestamp file every few seconds. When Rollup completes a new
build, it changes the timestamp and the Chrome extension reloads
itself.

If Rollup is not in watch mode, `simpleReloader` disables
itself`.

Make sure to do your final build outside of watch mode so that it
doesn't include the reloader.

#### Usage for `simpleReloader`

```javascript
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
    chromeExtension(),
    // Reloader goes after the main plugin
    simpleReloader(),
  ],
}
```

Start Rollup in watch mode. Enjoy auto-reloading whenever Rollup
makes a new build.

## Manifest API <a name = "manifest"></a>

### `[permissions]` <a name = "options-permissions"></a>

#### If a wrong permission has been detected

Sometimes a third-party module will reference a Chrome API to
detect its environment, but you don't need the permission in your
manifest.

```jsonc
// wrong permissions in output manifest.json
{
  "permissions": [
    "alarms", // This should not be here
    "storage"
  ]
}
```

**Solution:** Prefix unwanted permissions in the manifest with
`"!"`, for example, `"!alarms"`.

```jsonc
// source manifest.json
{
  "permissions": [
    "!alarms", // This permission will be excluded
    "storage"
  ]
}
```

```jsonc
// correct permissions in output manifest.json
{
  "permissions": ["storage"]
}
```

### `[web_accessible_resources]`

If you have files that are not imported to a script, or
referenced directly in the manifest or an HTML file, add them to
`web_accessible_resources`.

They will be written to `output.dir` with the same folder
structure as the source folder (the folder with the manifest
file). Relative paths may not lead outside of the source folder.

```jsonc
{
  "web_accessible_resources": [
    "fonts/some_font.oft",
    // HTML files are parsed like any other HTML file.
    "options2.html",
    // Globs are supported too!
    "**/*.png"
  ]
}
```

## Options API <a name = "options"></a>

You can use an options object with any of the following
properties. Everything is optional.

### `[browserPolyfill]` <a name = "options-browser-polyfill"></a>

| Type      |
| --------- |
| `boolean` |

Add the excellent [promisified Browser API]() by Mozilla to your
Chrome extension with one easy option:

```javascript
chromeExtension({
  browserPolyfill: true,
})
```

Don't forget to
[install types](https://www.npmjs.com/package/@types/firefox-webext-browser)
if you want Intellisense to work!

### `[dynamicImportWrapper]` <a name = "options-dynamic-import-wrapper"></a>

| Type                |
| ------------------- |
| `object` or `false` |

We use dynamic imports to support ES2015 modules and
[code splitting](https://medium.com/rollup/rollup-now-has-code-splitting-and-we-need-your-help-46defd901c82)
for JS files.

<!-- ARTICLE: write "modules in chrome extension" article -->

[Use modules in Chrome extension scripts](). Only disable if you
know what you're doing, because code splitting won't work if
`dynamicImportWrapper === false`.

### Why do we need to use dynamic import in scripts?
Two things are going on here:
This Rollup plugin leverages two Rollup features to parse the manifest into inputs:
*   It adds multiple parsed files to options.input
*   It uses options.output.dir to support multiple output files.
This means that [Rollup will use code-splitting](https://github.com/rollup/rollup/issues/2756#issuecomment-476242982). This is great because it makes a smaller bundle with no overlapping code, but we need a way to load those chunks into our content and background scripts.
After some experimentation, I found that ES modules are the best format for web extensions, but they don’t support ES modules in background or content scripts out of the box. 

The solution is to use [dynamic imports](https://stackoverflow.com/a/53033388/4842857) in extension scripts. All Chromium browsers and Firefox 89+ (coming May 2021) support this.


#### `[dynamicImportWrapper.wakeEvents]`

| Type       |
| ---------- |
| `string[]` |

Events that wake (reactivate) an extension may be lost if that
extension uses dynamic imports to load modules or asynchronously
adds event listeners.

<!-- ARTICLE: write "wake events and module loading" article -->

List events that will wake your background page (for example,
`'chrome.tabs.onUpdated'`, or `'chrome.runtime.onInstalled'`).
The script module loader will defer them until after all the
background script modules have fully loaded.

> It may be possible to statically analyze the background page
> code to detect which events the extension uses. Like
> [this issue]() if this is something that interests you!

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

| Type                  |
| --------------------- |
| `number` or `boolean` |

Delay Event page wake events by `n` milliseconds after the all
background page modules have finished loading. This may be useful
for event listeners that are added asynchronously.

```javascript
chromeExtension({
  dynamicImportWrapper: {
    eventDelay: 50,
  },
})
```

### `[verbose]`

| Type      |
| --------- |
| `boolean` |

Set to `false` to suppress "Detected permissions" message.

```javascript
// Example usage
chromeExtension({
  verbose: false,
})

// Default value
chromeExtension({
  verbose: true,
})
```

### `[pkg]` <a name = "options-pkg"></a>

| Type     |
| -------- |
| `object` |

Only use this field if you will not run Rollup using npm scripts
(for example, `$ npm run build`), since npm provides scripts with
the package info as an environment variable.

The fields `name`, `description`, and `version` are used.

These values are used to derive certain values from the
`package.json` for the extension manifest. A value set in the
source `manifest.json` will override a value from `package.json`.

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

| Type     |
| -------- |
| `string` |

<!-- ARTICLE: how to get stable extension id -->

If truthy, `manifest.key` will be set to this value. Use this
feature to
[stabilize the extension id during development](https://stackoverflow.com/questions/31422195/keep-chrome-extension-id-same-during-development).

> Note that this value is not the actual id. An extension id is
> derived from this value.

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
