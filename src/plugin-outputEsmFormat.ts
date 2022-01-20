import { code as esmWrapper } from 'code ./browser/code-MV3_esmWrapper.ts'
import jsesc from 'jsesc'
import { OutputAsset } from 'rollup'
import { importPath } from './browser/placeholders'
import { parse } from './path'
import {
  browserPolyfillName,
  browserPolyfillExecuteScriptName,
} from './plugin-browserPolyfill'
import { runtimeReloaderCS } from './plugin-runtimeReloader'
import { generateFileNames } from './plugin_helpers'
import { CrxPlugin, Manifest } from './types'

export const helperScripts: string[] = [
  runtimeReloaderCS,
  browserPolyfillName,
  browserPolyfillExecuteScriptName,
]

export const esmFormat = (): CrxPlugin => {
  const files = new Set<string>()

  return {
    name: 'esm-format',

    crx: true,
    enforce: 'post',

    // can't use renderCrxManifest b/c contentScriptResources should run first
    generateBundle(options, bundle) {
      files.clear()

      const manifestAsset = bundle[
        'manifest.json'
      ] as OutputAsset
      const manifest: Manifest = JSON.parse(
        manifestAsset.source as string,
      )

      for (const script of manifest.content_scripts ?? []) {
        script.js?.forEach((file, i) => {
          if (helperScripts.includes(file)) return
          if (files.has(file)) return
          files.add(file)

          const { wrapperFileName, outputFileName } =
            generateFileNames(file)
          const { base } = parse(wrapperFileName)
          const refId = this.emitFile({
            type: 'asset',
            source: esmWrapper.replace(
              importPath,
              jsesc(outputFileName),
            ),
            name: base,
          })
          script.js![i] = this.getFileName(refId)
        })
      }

      manifestAsset.source = JSON.stringify(manifest)
    },
  }
}
