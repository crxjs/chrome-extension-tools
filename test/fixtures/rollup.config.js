import json from '@rollup/plugin-json'
import sucrase from '@rollup/plugin-sucrase'
import path from 'path'
import bundleImports from 'rollup-plugin-bundle-imports'

const plugins = [
  json(),
  sucrase({
    transforms: ['typescript'],
  }),
  bundleImports({
    useVirtualModule: true,
    options: {
      external: ['%PATH%'],
    },
  }),
]

/* -------------- BUNDLE IMPORTS STUBS ------------- */

const config = {
  input: [
    path.join(__dirname, 'contentScriptWrapper.ts'),
    path.join(__dirname, 'executeScriptPolyfill.ts'),
    path.join(__dirname, 'importWrapper--explicit.ts'),
    path.join(__dirname, 'importWrapper--implicit.ts'),
    path.join(__dirname, 'reloaderBackground.ts'),
    path.join(__dirname, 'reloaderContent.ts'),
  ],
  output: {
    dir: path.join(__dirname, 'dist'),
    format: 'esm',
  },
  plugins,
}

export default config
