import { set } from 'lodash'
import { OutputAsset } from 'rollup'
import type {
  Manifest as ViteFilesManifest,
  ManifestChunk,
} from 'vite'
import { format } from './helpers'
import { CrxPlugin, Manifest } from './types'

export const cssImports = (): CrxPlugin => {
  let disablePlugin = true
  return {
    name: 'css-imports',
    crx: true,
    config(config) {
      disablePlugin = false
      set(config, 'build.manifest', true)
      return config
    },
    buildStart({ plugins }) {
      if (disablePlugin) return

      const viteManifest = plugins.find(
        ({ name }) => name === 'vite:manifest',
      )!

      const { generateBundle } = viteManifest
      if (!generateBundle) return
      viteManifest.generateBundle = async function (
        options,
        bundle,
        isWrite,
      ) {
        let filesData: ViteFilesManifest | undefined
        await generateBundle.call(
          {
            ...this,
            /**
             *  we don't want vite:manifest to actually emit a manifest
             *  it would conflict with the crx manifest 💥
             *  vite:manifest doesn't use the return value of emitFile
             *  https://github.com/vitejs/vite/blob/aab303f7bd333307c77363259f97a310762c4848/packages/vite/src/node/plugins/manifest.ts#L114-L119
             */
            emitFile: (file) => {
              if (file.type === 'chunk') return 'chunk id'
              filesData = JSON.parse(file.source as string)
              return 'asset id'
            },
          },
          options,
          bundle,
          isWrite,
        )

        if (!filesData) {
          this.warn(
            format`CSS files will not be emitted for content scripts.
            This is an unknown bug, please report it to RPCE on GitHub.`,
          )
          return
        }

        const files = Object.values(filesData)
        if (!files.length) return
        const filesByName = files.reduce(
          (map, file) => map.set(file.file, file),
          new Map<string, ManifestChunk>(),
        )

        const manifestAsset = bundle[
          'manifest.json'
        ] as OutputAsset
        const manifest: Manifest = JSON.parse(
          manifestAsset.source as string,
        )

        const { content_scripts: scripts = [] } = manifest
        for (const script of scripts) {
          for (const name of script.js ?? []) {
            const file = filesByName.get(name)
            const { css = [] } = file ?? {}
            if (css.length) {
              script.css = script.css ?? []
              script.css!.push(...css)
            }
          }
        }

        manifestAsset.source = JSON.stringify(manifest)
      }
    },
  }
}
