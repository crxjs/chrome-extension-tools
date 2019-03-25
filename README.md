# rollup-chrome-extension

Build Chrome Extensions with this composed Rollup plugin. This plugin returns an array of plugins, so you will need to spread it into the Rollup config plugins array.

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
  plugins: [
    // Spread it out!
    ...chromeExtension({ pkg }),
    resolve(),
    commonjs()
  ]
}
```
