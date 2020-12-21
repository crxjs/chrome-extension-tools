/* eslint-disable @typescript-eslint/explicit-function-return-type */
import commonjs from '@rollup/plugin-commonjs'
import resolve from '@rollup/plugin-node-resolve'
import typescript from '@rollup/plugin-typescript'
import { chromeExtension } from '../../../src/index'
import { getExtPath } from '../../utils'

export default {
  input: getExtPath('extend-manifest-as-object/manifest.json'),
  output: {
    dir: getExtPath('extend-manifest-as-object-dist'),
    format: 'esm',
  },
  plugins: [
    chromeExtension({
      verbose: false,
      extendManifest: {
        description:
          'properties from options.extendManifest are preferred',
        content_scripts: [
          {
            js: ['content.js'],
            matches: ['https://www.google.com/*'],
          },
        ],
      },
    }),
    resolve(),
    commonjs(),
  ],
}
