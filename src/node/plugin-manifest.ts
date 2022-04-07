import { readFile } from 'fs-extra'
import colors from 'picocolors'
import { OutputAsset, OutputChunk } from 'rollup'
import { ResolvedConfig } from 'vite'
import { ManifestV3Export } from './defineManifest'
import {
  decodeManifest,
  encodeManifest,
  htmlFiles,
  isString,
  manifestFiles,
  structuredClone,
} from './helpers'
import { ManifestV3 } from './manifest'
import { basename, join } from './path'
import { dynamicResourcesName } from './plugin-content-scripts'
import { CrxPlugin, CrxPluginFn, ManifestFiles } from './types'
import { manifestId, stubId } from './virtualFileIds'

// const debug = _debug('manifest')

/**
 * This plugin emits, transforms, renders, and outputs the manifest.
 *
 * It maps the manifest scripts to ref ids after `transformCrxManifest` and
 * renders them as output file names before `renderCrxManifest`.
 */
export const pluginManifest =
  (_manifest: ManifestV3Export): CrxPluginFn =>
  () => {
    let manifest: ManifestV3
    /** Vite plugins during production, file writer plugins during development */
    let plugins: CrxPlugin[]
    let refId: string
    let config: ResolvedConfig

    return [
      {
        name: 'crx:manifest-init',
        enforce: 'pre',
        async config(config, env) {
          manifest = await (typeof _manifest === 'function'
            ? _manifest(env)
            : _manifest)

          // TODO: build this out into full validation plugin
          if (manifest.manifest_version !== 3)
            throw new Error(
              `Manifest v${manifest.manifest_version} is currently unsupported, please use manifest v3`,
            )

          // pre-bundle dependencies
          if (env.command === 'serve') {
            const {
              contentScripts: js,
              background: serviceWorker,
              html,
            } = await manifestFiles(manifest)
            let { entries = [] } = config.optimizeDeps ?? {}
            entries = [entries].flat()
            entries.push(...js, ...serviceWorker, ...html)

            return {
              ...config,
              optimizeDeps: {
                ...config.optimizeDeps,
                entries,
              },
            }
          }
        },
        buildStart(options) {
          if (options.plugins) plugins = options.plugins
        },
      },
      {
        name: 'crx:manifest-loader',
        apply: 'build',
        enforce: 'pre',
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
        name: 'crx:manifest-post',
        apply: 'build',
        enforce: 'post',
        configResolved(_config) {
          config = _config

          const plugins = config.plugins as CrxPlugin[]
          // crx:manifest-post needs to come after vite:manifest; enforce:post puts it before
          const crx = plugins.findIndex(
            ({ name }) => name === 'crx:manifest-post',
          )
          const [plugin] = plugins.splice(crx, 1)
          plugins.push(plugin)
        },
        async transform(code, id) {
          if (id !== manifestId) return

          /* ---------- RUN MANIFEST TRANSFORM HOOK ---------- */

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

          /* ----------- EMIT SCRIPTS AND RESOURCES ---------- */

          // always emit content scripts
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

          if (!this.meta.watchMode) {
            // file writer does not emit background
            if (manifest.background?.service_worker) {
              const file = manifest.background.service_worker
              const refId = this.emitFile({
                type: 'chunk',
                id: file,
                name: basename(file),
              })
              manifest.background.service_worker = refId
            }
            // file writer does not emit html files
            for (const file of htmlFiles(manifest)) {
              this.emitFile({
                type: 'chunk',
                id: file,
                name: basename(file),
              })
            }
          }

          const encoded = encodeManifest(manifest)
          return encoded
        },
        async generateBundle(options, bundle) {
          const manifestName = this.getFileName(refId)
          const manifestJs = bundle[manifestName] as OutputChunk
          let manifest = decodeManifest.call(this, manifestJs.code)

          /* ----------- UPDATE EMITTED FILE NAMES ----------- */

          // update background service worker filename from ref
          // service worker not emitted during development, so don't update file name
          if (manifest.background?.service_worker && !this.meta.watchMode) {
            const ref = manifest.background.service_worker
            const name = this.getFileName(ref)
            manifest.background.service_worker = name
          }

          // update content script file names from refs
          // TODO: emit and parse css
          manifest.content_scripts = manifest.content_scripts?.map(
            ({ js = [], ...rest }) => {
              const refJS = js.map((ref) => this.getFileName(ref))
              return { js: refJS, ...rest }
            },
          )

          // update web accessible resources from refs
          // ignore top level match patterns (don't copy node_modules)
          manifest.web_accessible_resources =
            manifest.web_accessible_resources?.map(
              ({ resources, ...rest }) => ({
                resources: resources.map((r) =>
                  r.startsWith('*') || r === dynamicResourcesName
                    ? r
                    : this.getFileName(r),
                ),
                ...rest,
              }),
            )

          /* ------------ RUN MANIFEST RENDER HOOK ----------- */

          // this appears to run after generateBundle since this is the last plugin
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
              const name = `[${plugin.name}]`
              let message = error
              if (error instanceof Error) {
                message = colors.red(
                  `${name} ${error.stack ? error.stack : error.message}`,
                )
              } else if (typeof error === 'string') {
                message = colors.red(`${name} ${error}`)
              }

              console.log(message)

              throw new Error(`Error in ${plugin.name}.renderCrxManifest`)
            }
          }

          /* ---------- COPY MISSING MANIFEST ASSETS --------- */

          const assetTypes: (keyof ManifestFiles)[] = [
            'icons',
            'locales',
            'rulesets',
          ]
          const files = await manifestFiles(manifest)
          await Promise.all(
            assetTypes
              .map((k) => files[k])
              .flat()
              .map(async (f) => {
                if (typeof bundle[f] === 'undefined') {
                  const filename = join(config.root, f)
                  this.emitFile({
                    type: 'asset',
                    fileName: f,
                    // TODO: cache source buffer
                    source: await readFile(filename),
                  })
                }
              }),
          )

          /* -------------- OUTPUT MANIFEST FILE ------------- */

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
