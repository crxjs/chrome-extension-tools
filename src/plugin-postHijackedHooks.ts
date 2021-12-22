import { CrxPlugin, InternalCrxPlugin } from './types'

export const postHijackedHooks = (): CrxPlugin => {
  let plugins: InternalCrxPlugin[]
  return {
    name: 'post-hijacked-hooks',
    enforce: 'post',
    apply: 'build',
    buildStart({ plugins: p }) {
      plugins = p
    },
    async generateBundle(options, bundle, isWrite) {
      for (const p of plugins) {
        await p.crxGenerateBundle?.call(
          this,
          options,
          bundle,
          isWrite,
        )
      }
    },
  }
}
