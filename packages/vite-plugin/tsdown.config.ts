import fs from 'fs-extra'
import path from 'pathe'
import { bundleClientCode } from './client-bundle-plugin.ts'
import { defineConfig, type TsdownPlugin } from 'tsdown'

const root = process.cwd()

const { dependencies, devDependencies } = fs.readJsonSync(
  path.join(root, 'package.json'),
)

const neverBundle: (string | RegExp)[] = [
  ...Object.keys({
    ...dependencies,
    ...devDependencies,
  }),
  'v8',
  'fs',
  'fs/promises',
  'path',
  'crypto',
  'module',
  'url',
  'perf_hooks',
  /^node:/,
  /%PROTO%/,
  /%PORT%/,
  /%PATH%/,
]

export default defineConfig([
  {
    entry: { index: 'src/node/index.ts' },
    format: ['esm'],
    dts: true,
    outExtensions: () => ({ js: '.mjs', dts: '.d.mts' }),
    platform: 'node',
    target: 'esnext',
    deps: { neverBundle },
    outDir: 'dist',
    clean: true,
    plugins: [bundleClientCode() as unknown as TsdownPlugin],
    hooks: {
      'build:done': async () => {
        // `acorn` types are only used by internal helpers that are tree-shaken
        // out of the declarations, so drop the unused import: `acorn` is not a
        // published dependency and strict consumers could not resolve it.
        const dtsPath = path.join(root, 'dist/index.d.mts')
        await fs.writeFile(
          dtsPath,
          (await fs.readFile(dtsPath, 'utf8')).replace(
            /^import ['"]acorn['"];\n/m,
            '',
          ),
        )
      },
    },
  },
])
