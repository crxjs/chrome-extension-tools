/* eslint-disable @typescript-eslint/explicit-function-return-type */
import commonjs from '@rollup/plugin-commonjs'
import resolve from '@rollup/plugin-node-resolve'
import typescript from '@rollup/plugin-typescript'
import { chromeExtension } from '../../../src/index'
import { getCrxName, getExtPath } from '../../utils'
import { basename } from 'path'

const crxName = basename(__dirname)

export default {
  input: getExtPath(crxName, 'manifest.json'),
  output: {
    dir: getExtPath(crxName, 'dist'),
    format: 'esm',
  },
  plugins: [
    chromeExtension({
      verbose: false,
      extendManifest: ({
        name,
        description,
        background,
        ...manifest
      }) => {
        background.persistent = true

        return Object.assign(manifest, {
          name: name + '123',
          description: description
            .split('')
            .reverse()
            .join(''),
          background,
          options_page: 'options.html',
          ...manifest,
        })
      },
    }),
    resolve(),
    commonjs(),
  ],
}
