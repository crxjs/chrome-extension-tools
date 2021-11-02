# [rollup-plugin-chrome-extension](https://www.extend-chrome.dev/rollup-plugin)

[![npm (scoped)](https://img.shields.io/npm/v/rollup-plugin-chrome-extension.svg)](https://www.npmjs.com/package/rollup-plugin-chrome-extension)
[![GitHub last commit](https://img.shields.io/github/last-commit/extend-chrome/rollup-plugin-chrome-extension.svg?logo=github)](https://github.com/extend-chrome/rollup-plugin-chrome-extension)
![GitHub action badge](https://github.com/extend-chrome/rollup-plugin-chrome-extension/actions/workflows/main.yml/badge.svg)
[![TypeScript Declarations Included](https://img.shields.io/badge/types-TypeScript-informational)](#typescript)

<a href="https://www.extend-chrome.dev/rollup-plugin" rel="noopener">
  <img width=200px height=200px src="https://imgur.com/wEXnCYK.png" alt="rollup-plugin-chrome-extension logo"></a>

A feature-rich solution for bundled Chrome Extensions, brought to
you by [Extend Chrome](https://extend-chrome.dev).

Build Chrome extensions using
[Rollup](https://rollupjs.org/guide/en/), with
[minimal configuration](https://www.extend-chrome.dev/rollup-plugin#usage).
Now with MV3 support.

Use `manifest.json` as the input. Every file in the manifest will
be bundled or copied to the output folder.

> Vite support is in beta! [See the PR for details](https://github.com/extend-chrome/rollup-plugin-chrome-extension/pull/117).

## [Documentation](https://www.extend-chrome.dev/rollup-plugin)

We have
[boilerplates](https://www.extend-chrome.dev/rollup-plugin#chrome-extension-boilerplates)
for
[React JavaScript](https://github.com/extend-chrome/js-react-boilerplate),
[React TypeScript](https://github.com/extend-chrome/ts-react-boilerplate)
and
[Svelte](https://github.com/kyrelldixon/svelte-tailwind-extension-boilerplate),
as well as
[instructions](https://www.extend-chrome.dev/rollup-plugin#usage)
for setting up your own project.

See the
[documentation](https://www.extend-chrome.dev/rollup-plugin) for
usage and how to get started.

## Contributing

Your help is super welcome!

👀 Be sure to take a look at the issues before starting to work
on a new feature.

🙏 Please update the tests to cover bug fixes or new features.

📕 If you want to update the docs, you can find the docs repo
over here:

https://github.com/jacksteamdev/extend-chrome-docs

## Development

Our preferred package manager is [pnpm](https://pnpm.io/), but
npm or Yarn should work.

If you're using VSCode you can run the default build task
(Ctrl+Shift+B or ⇧⌘B for Mac) to start building and type
checking.
