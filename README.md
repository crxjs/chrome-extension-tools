# ![CRXJS](./banner-github.png)

## What is CRXJS?

CRXJS is a project to bring a modern developer experience to the Chrome
Extension ecosystem. This repo houses two bundling libraries: a
[modern Vite plugin](./packages/vite-plugin/README.md) and a
[legacy Rollup plugin](./packages/rollup-plugin/README.md).

[Get Started in 90 seconds.](https://crxjs.dev/vite-plugin)

## Features

If you're starting a new Chrome Extension project, consider using
[`@crxjs/vite-plugin`](https://crxjs.dev/vite-plugin). This Vite plugin brings
all the features of Vite to the Chrome Extension developer experience.

|                               |                                          [`@crxjs/vite-plugin`](./packages/vite-plugin/README.md)                                           |                                         [`rollup-plugin-chrome-extension`](./packages/rollup-plugin/README.md)                                          |
| :---------------------------- | :-----------------------------------------------------------------------------------------------------------------------------------------: | :-----------------------------------------------------------------------------------------------------------------------------------------------------: |
| Works on                      |                                                        [Vite](https://vitejs.dev) ⚡                                                        |                                                             [Rollup](https://rollupjs.org)                                                              |
| Simple Config                 |                                                                     Yes                                                                     |                                                                           Yes                                                                           |
| HMR                           |                                                                  True HMR                                                                   |                                                                       Auto-reload                                                                       |
| Static Asset Imports          |                                                                     Yes                                                                     |                                                                       With config                                                                       |
| MV3                           |                                                                     Yes                                                                     |                                                                           Yes                                                                           |
| MV2                           |                                                                      -                                                                      |                                                                           Yes                                                                           |
| Auto Web-accessible Resources |                                                                     Yes                                                                     |                                                                            -                                                                            |
| Documentation                 |                                           [CRXJS Vite Plugin Docs](https://crxjs.dev/vite-plugin)                                           |                                              [Extend Chrome Docs](https://www.extend-chrome.dev/rollup-plugin)                                              |
| NPM                           | [![npm (scoped)](https://img.shields.io/npm/v/@crxjs/vite-plugin/latest.svg)](https://www.npmjs.com/package/rollup-plugin-chrome-extension) | [![npm (scoped)](https://img.shields.io/npm/v/rollup-plugin-chrome-extension/latest.svg)](https://www.npmjs.com/package/rollup-plugin-chrome-extension) |

## Supporting

If these plugins have helped you ship your product faster, please consider
[sponsoring me](https://github.com/sponsors/jacksteamdev) on GitHub.

## Contributing

We encourage pull requests! This is a
[pnpm monorepo](https://pnpm.io/workspaces), so use pnpm instead of Yarn or npm.
