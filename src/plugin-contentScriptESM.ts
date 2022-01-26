import { code as esmWrapper } from 'code ./browser/code-MV3_esmWrapper.ts'
import jsesc from 'jsesc'
import { OutputAsset } from 'rollup'
import { importPath } from './browser/placeholders'
import { isContentScript } from './files.sharedEvents'
import { basename } from './path'
import {
  browserPolyfillExecuteScriptName,
  browserPolyfillName,
} from './plugin-browserPolyfill'
import { runtimeReloaderCS } from './plugin-runtimeReloader'
import {
  generateFileNames,
  getRpceAPI,
  RpceApi,
} from './plugin_helpers'
import { CrxPlugin, Manifest } from './types'

export const helperScripts: string[] = [
  runtimeReloaderCS,
  browserPolyfillName,
  browserPolyfillExecuteScriptName,
]

export const contentScriptESM = (): CrxPlugin => {
  let api: RpceApi

  return {
    name: 'content-script-ESM',
    apply: 'build',
    buildStart({ plugins }) {
      api = getRpceAPI(plugins)
    },
    generateBundle(options, bundle) {
      // emit wrappers for all content scripts
      for (const file of api.filesByFileName.values()) {
        if (isContentScript(file)) {
          const { wrapperFileName } = generateFileNames(
            file.fileName,
          )
          const refId = this.emitFile({
            type: 'asset',
            name: basename(wrapperFileName),
            source: esmWrapper.replace(
              importPath,
              jsesc(this.getFileName(file.refId)),
            ),
          })
          file.wrapperName = this.getFileName(refId)
        }
      }

      // update manifest content scripts with wrapper names
      const manifestAsset = bundle[
        'manifest.json'
      ] as OutputAsset
      const manifest: Manifest = JSON.parse(
        manifestAsset.source as string,
      )

      for (const script of manifest.content_scripts ?? []) {
        script.js?.forEach((name, i) => {
          if (helperScripts.includes(name)) return
          const fileName = generateFileNames(name).outputFileName
          script.js![i] =
            api.filesByFileName.get(fileName)!.wrapperName!
        })
      }

      manifestAsset.source = JSON.stringify(manifest)
    },
  }
}
