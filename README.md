# rollup-plugin-chrome-extension

Rollup Chrome Extensions easily, with minimal configuration.

Use `manifest.json` as the input. Every file in the manifest will become an entry point or asset.

Includes an automatic reloader, so the extension will reload itself after a build completes in Rollup watch mode. This adds a module to the extension, so make sure to build the extension outside of watch mode before you release it on the store.

> Note: this plugin is in beta, and the API will change some from version to version.

## Installation

```sh
npm i rollup-plugin-chrome-extension -D
```

## Usage

```js
import { rollup } from 'rollup'
import resolve from 'rollup-plugin-node-resolve'
import commonjs from 'rollup-plugin-commonjs'

import chromeExtension from 'rollup-plugin-chrome-extension'

export default {
  input: 'src/manifest.json',
  output: {
    dir: 'build',
    format: 'esm',
  },
  // always put chromeExtension() before other plugins
  plugins: [chromeExtension(), resolve(), commonjs()],
}
```

## API

Everything is optional.

### `[options.verbose]`

Type: boolean

### `[options.permissions]`

Type: Array of minimatch patterns

### `[options.assets]`

Type: Array of minimatch patterns

### `[options.entries]`

Type: Array of minimatch patterns

### `[options.iiafe]`

Type: object

All entry js files in the manifest are converted to immediately invoked async function expressions (IIAFE). See [Why IIAFE?](#) for more information.

Default: Includes all `js` files in the manifest.

Set `options.iiafe.exclude` to exclude some files, for example, files in `manifest.web_accessible_resources` that you want to use a different format.

### `[options.publicKey]`

Type: string

If truthy, `manifest.key` will equal this value. Use this feature to stabilize the extension id during development.

### `[options.useReloader]`

Type: boolean

Include or omit the automatic reloader module from the extension build.

Default: If Rollup is in watch mode, it will include the reloader module.

### `[options.pkg]`

Type: object

These values are used to derive certain values from the `package.json` for the extension manifest. Any value in the source `manifest.json` will overwrite these values.

Default: If undefined and we run Rollup using npm, it will use the `name` field from `package.json`.

### `[options.pkg.name]`

Type: string

### `[options.pkg.description]`

Type: string

### `[options.pkg.version]`

Type: string

# Why IIAFE?

[Code splitting](https://rollupjs.org/guide/en#code-splitting). Often code is reused between contexts, i.e., a background script and a popup page. Rollup will automatically split this code into another file called a chunk. This works great, but there's a catch: ES6 Import statements are not supported in background and content scripts!

We can use dynamic imports, however. In order to take advantage of code splitting, we can convert ES6 import statements to dynamic imports using the `await` keyword and wrap the final entry file in an IIAFE.
