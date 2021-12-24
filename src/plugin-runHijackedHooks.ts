import { CrxPlugin, InternalCrxPlugin } from './types'

// TODO: is this needed anymore? Think about hooks
export const runHijackedHooks = (): CrxPlugin[] => {
  let plugins: InternalCrxPlugin[]
  return [
    {
      name: 'pre-hijacked-hooks',
      enforce: 'pre',
      apply: 'build',
      async buildStart(options) {
        plugins = options.plugins
        await Promise.all(
          plugins
            .filter(({ enforce }) => enforce === 'pre')
            .map((p) => p.crxBuildStart?.call(this, options)),
        )
      },
      async generateBundle(options, bundle, isWrite) {
        for (const p of plugins) {
          if (p.enforce !== 'pre') continue
          await p.crxGenerateBundle?.call(
            this,
            options,
            bundle,
            isWrite,
          )
        }
      },
    },
    {
      name: 'mid-hijacked-hooks',
      apply: 'build',
      async buildStart(options) {
        plugins = options.plugins
        await Promise.all(
          plugins
            .filter(({ enforce }) => !enforce)
            .map((p) => p.crxBuildStart?.call(this, options)),
        )
      },
      async generateBundle(options, bundle, isWrite) {
        for (const p of plugins) {
          if (p.enforce) continue
          await p.crxGenerateBundle?.call(
            this,
            options,
            bundle,
            isWrite,
          )
        }
      },
    },
    {
      name: 'post-hijacked-hooks',
      enforce: 'post',
      apply: 'build',
      async buildStart(options) {
        plugins = options.plugins
        await Promise.all(
          plugins
            .filter(({ enforce }) => enforce === 'post')
            .map((p) => p.crxBuildStart?.call(this, options)),
        )
      },
      async generateBundle(options, bundle, isWrite) {
        for (const p of plugins) {
          if (p.enforce !== 'post') continue
          await p.crxGenerateBundle?.call(
            this,
            options,
            bundle,
            isWrite,
          )
        }
      },
    },
  ]
}
