# [rollup-plugin-chrome-extension](https://www.extend-chrome.dev/rollup-plugin)

[![npm (scoped)](https://img.shields.io/npm/v/rollup-plugin-chrome-extension/beta.svg)](https://www.npmjs.com/package/rollup-plugin-chrome-extension)
[![GitHub last commit](https://img.shields.io/github/last-commit/extend-chrome/rollup-plugin-chrome-extension.svg?logo=github)](https://github.com/extend-chrome/rollup-plugin-chrome-extension)
![GitHub action badge](https://github.com/extend-chrome/rollup-plugin-chrome-extension/actions/workflows/main.yml/badge.svg)
[![TypeScript Declarations Included](https://img.shields.io/badge/types-TypeScript-informational)](#typescript)

<a href="https://www.extend-chrome.dev/rollup-plugin" rel="noopener">
  <img width=200px height=200px src="https://imgur.com/wEXnCYK.png" alt="rollup-plugin-chrome-extension logo"></a>

The bundler configuration for a Chrome Extension can be pretty complex. This
plugin makes it simple.

The manifest is front and center. Import your manifest to your config file and
RPCE will do the rest.

RPCE simplifies project config and supports many of Vite's features in the
Chrome Extension environment, including HMR.

## Vite Usage (beta)

Vite support is in beta! Check out this
[90 second getting started guide](https://dev.to/jacksteamdev/create-a-vite-react-chrome-extension-in-90-seconds-3df7).

```sh
npm i rollup-plugin-chrome-extension@beta -D
```

```javascript
// vite.config.js

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { crx } from 'rollup-plugin-chrome-extension'
import manifest from './manifest.json'

export default defineConfig({
  plugins: [react(), crx({ manifest })],
})
```

Just add new features to your manifest, and RPCE does the rest.

## [Documentation for v3](https://www.extend-chrome.dev/rollup-plugin)

We have
[v3 boilerplates](https://www.extend-chrome.dev/rollup-plugin#chrome-extension-boilerplates)
for [React JavaScript](https://github.com/extend-chrome/js-react-boilerplate),
[React TypeScript](https://github.com/extend-chrome/ts-react-boilerplate) and
[Svelte](https://github.com/kyrelldixon/svelte-tailwind-extension-boilerplate),
as well as [instructions](https://www.extend-chrome.dev/rollup-plugin#usage) for
setting up your project.

See the [documentation](https://www.extend-chrome.dev/rollup-plugin) for usage
and how to get started.

## Contributing

Your help is super welcome!

🎯 Ongoing development is for v4+ only.

👀 Be sure to take a look at the issues before starting to work on a new
feature.

🙏 Please update the tests to cover bug fixes or new features.

📕 Documentation for v4 has not yet begun, but you can open an issue for help.

✨ If you enjoy using RPCE, please help spread the word!

## Development

This monorepo uses [pnpm](https://pnpm.io/).
