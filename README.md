# rollup-plugin-chrome-extension

Build Chrome Extensions easily, with minimal Rollup configuration.

Use `manifest.json` as the input. Every file in the manifest will become an entry point or asset. It parses `html` files to retrieve both script tags and style sheets.

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

import pkg from './package.json'

export default {
  input: 'src/manifest.json',
  output: {
    dir: 'build',
    format: 'esm'
  },
  plugins: [chromeExtension({ pkg }), resolve(), commonjs()]
}
```
