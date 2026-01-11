![CRXJS](./banner-github.png)

<h1 align="center">CRXJS</h1>

<p align="center">
Build cross-browser extensions with native <code>HMR</code> and <code>zero-config</code> setup
</p>

<p align="center">
<a href="https://www.npmjs.com/package/@crxjs/vite-plugin">
<img src="https://img.shields.io/npm/v/@crxjs/vite-plugin?color=298cd6&amp;label=CRXJS&labelColor=f2bae4" alt="NPM version">
</a>
</p>

<h2 align="center">
<a href="https://crxjs.dev">Documentation</a> |
<a href="https://discord.com/invite/FnnE4XR7Wj">Discord </a>
</h2>

## Create CRXJS Project

```shell
npm create crxjs@latest
```

> [!IMPORTANT] > `@latest` MUST NOT be omitted, otherwise `npm` may resolve to a
> cached and outdated version of the package.

## Features

- **Full Vite Plugin Ecosystem** - Leverage any Vite-compatible plugins with
  zero extra setup
- **Zero Configuration** - Start developing immediately with intelligent
  defaults
- **Manifest V3 Support** - Built for modern Chrome extensions with enhanced
  security
- **True Hot Module Replacement** - Instant UI updates while preserving
  extension state (works with content scripts)
- **Static Asset Import** - Directly reference images/fonts in your code
- **Auto Web-Accessible Resources** - Automatic generation of
  `web_accessible_resources` manifest entries

> [!NOTE]  
> Looking for MV2 support? See
> [`rollup-plugin`](packages/rollup-plugin/README.md)

## Development

- Clone this repository
- Install [bun](https://bun.sh)
- Install dependencies using `bun install`
- Build the `vite-plugin` project using `bun run build:vite-plugin`
- Playgrounds project is located at `playgrounds/**`, using `bun run play` can
  run the playgrounds
- Cd into the `vite-plugin` directory using `cd packages/vite-plugin`
- Test using `bun run test`
- Use [DeepWiki](https://deepwiki.com/crxjs/chrome-extension-tools) to learn
  more about CRXJS

## Contributors

This project exists thanks to all the people who contribute.

And thank you to all our backers!

<a href="https://github.com/crxjs/chrome-extension-tools/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=crxjs/chrome-extension-tools" />
</a>

## Supporting

If these plugins have helped you ship your product faster, please consider
[sponsoring me](https://github.com/sponsors/jacksteamdev) on GitHub.
