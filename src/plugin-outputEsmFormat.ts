import { code as esmWrapper } from 'code ./browser/code-MV3_esmWrapper.ts'
import jsesc from 'jsesc'
import { importPath } from './browser/placeholders'
import { parse } from './path'
import { runtimeReloaderCS } from './plugin-runtimeReloader'
import { CrxPlugin } from './types'

const excluded: string[] = [runtimeReloaderCS]

export const esmFormat = (): CrxPlugin => {
  const files = new Set<string>()

  return {
    name: 'esm-format',

    crx: true,
    enforce: 'post',

    renderCrxManifest(manifest) {
      files.clear()

      for (const script of manifest.content_scripts ?? []) {
        script.js?.forEach((file, i) => {
          if (excluded.includes(file)) return
          if (files.has(file)) return
          files.add(file)

          const { name } = parse(file)
          const refId = this.emitFile({
            type: 'asset',
            source: esmWrapper.replace(importPath, jsesc(file)),
            name: `esm-wrapper-${name}.js`,
          })
          script.js![i] = this.getFileName(refId)
        })
      }

      return manifest
    },
  }
}
