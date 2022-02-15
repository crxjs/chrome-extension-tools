import { OutputAsset, OutputChunk } from 'rollup'
import { ManifestV3Export } from './define'
import {
  decodeManifest,
  encodeManifest,
  htmlFiles,
  isString,
  structuredClone,
} from './helpers'
import { ManifestV3 } from './manifest'
import { basename } from './path'
import { CrxPlugin, CrxPluginFn } from './types'

// const debug = _debug('crx:manifest')

const manifestId = 'crx:manifest'
const stubId = 'crx:stub'
/**
 * This plugin emits, transforms, renders, and outputs the manifest.
 *
 * It maps the manifest scripts to ref ids after `transformCrxManifest` and
 * renders them as output file names before `renderCrxManifest`.
 */
export const pluginManifest =
  (_manifest: ManifestV3Export): CrxPluginFn =>
  () => {
    let refId: string
    let plugins: CrxPlugin[]
    let manifest: ManifestV3

    return [
      {
        name: 'crx:manifest-loader',
        apply: 'build',
        enforce: 'pre',
        async config(config, env) {
          manifest = await (typeof _manifest === 'function'
            ? _manifest(env)
            : _manifest)
        },
        buildStart() {
          refId = this.emitFile({
            type: 'chunk',
            id: manifestId,
            name: 'crx-manifest.js',
            preserveSignature: 'strict',
          })
        },
        resolveId(source) {
          if (source === manifestId) return manifestId
          return null
        },
        load(id) {
          if (id === manifestId) return encodeManifest(manifest)
          return null
        },
      },
      {
        name: 'crx:stub-input',
        apply: 'build',
        enforce: 'pre',
        options({ input, ...options }) {
          /**
           * By using a stub as the default input, we can avoid extending
           * complicated inputs and easily find the manifest in
           * crx:manifest#generateBundle using a ref id.
           */
          return {
            input:
              isString(input) && input.endsWith('index.html') ? stubId : input,
            ...options,
          }
        },
        resolveId(source) {
          if (source === stubId) return stubId
          return null
        },
        load(id) {
          if (id === stubId) return `console.log('stub')`
          return null
        },
        generateBundle(options, bundle) {
          for (const [key, chunk] of Object.entries(bundle)) {
            if (chunk.type === 'chunk' && chunk.facadeModuleId === stubId) {
              delete bundle[key]
              break
            }
          }
        },
      },
      {
        name: 'crx:manifest',
        apply: 'build',
        enforce: 'post',
        configResolved(config) {
          plugins = config.plugins as CrxPlugin[]
          // crx:manifest needs to come after vite:manifest; enforce:post puts it before
          const vite = plugins.findIndex(({ name }) => name === 'vite:manifest')
          const crx = plugins.findIndex(({ name }) => name === 'crx:manifest')
          if (vite > crx) {
            const [plugin] = plugins.splice(crx, 1)
            plugins.splice(vite + 1, 0, plugin)
          }
        },
        async transform(code, id) {
          if (id !== manifestId) return

          let manifest = decodeManifest.call(this, code)
          for (const plugin of plugins) {
            try {
              const m = structuredClone(manifest)
              const result = await plugin.transformCrxManifest?.call(this, m)
              manifest = result ?? manifest
            } catch (error) {
              if (error instanceof Error)
                error.message = `[${plugin.name}] ${error.message}`
              throw error
            }
          }

          // emit background service worker, but NOT during development
          // service worker is served during development
          if (manifest.background?.service_worker && !this.meta.watchMode) {
            const file = manifest.background.service_worker
            const refId = this.emitFile({
              type: 'chunk',
              id: file,
              name: basename(file),
            })
            manifest.background.service_worker = refId
          }

          // emit content scripts
          if (manifest.content_scripts?.length) {
            // css[] should be added and removed by crx:styles
            manifest.content_scripts = manifest.content_scripts.map(
              ({ js = [], ...rest }) => {
                const refJS = js.map((file) =>
                  this.emitFile({
                    type: 'chunk',
                    id: file,
                    name: basename(file),
                  }),
                )

                return { js: refJS, ...rest }
              },
            )
          }

          // bundle html files only in watch mode
          if (!this.meta.watchMode)
            for (const file of htmlFiles(manifest)) {
              this.emitFile({
                type: 'chunk',
                id: file,
                name: basename(file),
              })
            }

          const encoded = encodeManifest(manifest)
          return encoded
        },
        async generateBundle(options, bundle) {
          const manifestName = this.getFileName(refId)
          const manifestJs = bundle[manifestName] as OutputChunk
          let manifest = decodeManifest.call(this, manifestJs.code)

          // update background service worker filename from ref
          // service worker not emitted during development, so don't update file name
          if (manifest.background?.service_worker && !this.meta.watchMode) {
            const ref = manifest.background.service_worker
            const name = this.getFileName(ref)
            manifest.background.service_worker = name
          }

          // update content script file names from refs
          // css[] is added and removed by crx:css
          manifest.content_scripts = manifest.content_scripts?.map(
            ({ js = [], ...rest }) => {
              const refJS = js.map((ref) => this.getFileName(ref))
              return { js: refJS, ...rest }
            },
          )

          for (const plugin of plugins) {
            try {
              const m = structuredClone(manifest)
              const result = await plugin.renderCrxManifest?.call(
                this,
                m,
                bundle,
              )
              manifest = result ?? manifest
            } catch (error) {
              if (error instanceof Error)
                error.message = `[${plugin.name}] ${error.message}`
              throw error
            }
          }

          // overwrite vite manifest.json after render hooks
          const manifestJson = bundle['manifest.json'] as OutputAsset
          if (typeof manifestJson === 'undefined') {
            this.emitFile({
              type: 'asset',
              fileName: 'manifest.json',
              source: JSON.stringify(manifest, null, 2),
            })
          } else {
            manifestJson.source = JSON.stringify(manifest, null, 2)
          }

          // remove manifest js file, we're done with it :)
          delete bundle[manifestName]
        },
      },
    ]
  }
