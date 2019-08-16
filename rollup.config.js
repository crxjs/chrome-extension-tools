/* eslint-env node */

import bundleImports from 'rollup-plugin-bundle-imports'

const plugins = [
  bundleImports({
    include: ['**/*.sw.js'],
    importAs: 'path',
  }),
  bundleImports({
    include: ['**/*.code.js'],
    importAs: 'code',
  }),
]

export default [
  {
    input: 'src/index.js',
    output: [
      {
        file: 'dist/chrome-extension-esm.js',
        format: 'esm',
        sourcemap: 'inline',
      },
      {
        file: 'dist/chrome-extension-cjs.js',
        format: 'cjs',
        sourcemap: 'inline',
      },
    ],
    external: [
      '@bumble/manifest',
      'cheerio',
      'fs-extra',
      'is-valid-path',
      'magic-string',
      'mem',
      'path',
      'picomatch',
      'rollup-pluginutils',
    ],
    plugins,
  },
  {
    input: 'reloader/socket/src/index.js',
    output: [
      {
        file: 'reloader/socket/dist/reloader-esm.js',
        format: 'esm',
        sourcemap: 'inline',
      },
      {
        file: 'reloader/socket/dist/reloader-cjs.js',
        format: 'cjs',
        sourcemap: 'inline',
      },
    ],
    external: ['debounce', 'express', 'http', 'socket.io'],
    plugins,
  },
  {
    input: 'reloader/push/src/index.js',
    output: [
      {
        file: 'reloader/push/dist/reloader-esm.js',
        format: 'esm',
        sourcemap: 'inline',
      },
      {
        file: 'reloader/push/dist/reloader-cjs.js',
        format: 'cjs',
        sourcemap: 'inline',
      },
    ],
    external: [
      '@firebase/app',
      '@firebase/auth',
      '@firebase/functions',
    ],
    plugins,
  },
  {
    input: 'reloader/interval/src/index.js',
    output: [
      {
        file: 'reloader/interval/dist/reloader-esm.js',
        format: 'esm',
        sourcemap: 'inline',
      },
      {
        file: 'reloader/interval/dist/reloader-cjs.js',
        format: 'cjs',
        sourcemap: 'inline',
      },
    ],
    plugins,
  },
  {
    input: 'src/manifest-input/dynamicImportWrapper.js',
    output: {
      file: 'dist/dynamicImportWrapper.js',
      format: 'iife',
    },
    external: ['%PATH%'],
    treeshake: false,
  },
]
