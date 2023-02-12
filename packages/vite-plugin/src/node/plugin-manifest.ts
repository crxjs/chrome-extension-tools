import precontrollerJs from 'client/es/page-precontroller-script.ts'
import precontrollerHtml from 'client/html/precontroller.html'
import { existsSync, promises as fs } from 'fs'
import colors from 'picocolors'
import { OutputAsset, OutputChunk } from 'rollup'
import { ResolvedConfig } from 'vite'
import { contentScripts, hashScriptId } from './contentScripts'
import { htmlFiles, manifestFiles } from './files'
import { formatFileData, getFileName, prefix } from './fileWriter-utilities'
import {
  decodeManifest,
  encodeManifest,
  isString,
  structuredClone,
} from './helpers'
import { ManifestV3 } from './manifest'
import { basename, isAbsolute, join, relative } from './path'
import { getOptions } from './plugin-optionsProvider'
import { CrxPlugin, CrxPluginFn, ManifestFiles } from './types'
import { manifestId, stubId } from './virtualFileIds'
const { readFile } = fs

// const debug = _debug('manifest')

/**
 * This plugin emits, transforms, renders, and outputs the manifest.
 *
 * It maps the manifest scripts to ref ids after `transformCrxManifest` and
 * renders them as output file names before `renderCrxManifest`.
 */
export const pluginManifest: CrxPluginFn = () => {
  let manifest: ManifestV3
  let plugins: CrxPlugin[]
  let refId: string
  let config: ResolvedConfig

  return [
    {
      name: 'crx:manifest-init',
      enforce: 'pre',
      async config(config, env) {
        const { manifest: _manifest } = await getOptions(config)
        manifest = await (typeof _manifest === 'function'
          ? _manifest(env)
          : _manifest)

        // TODO: build this out into full validation plugin
        if (manifest.manifest_version !== 3)
          throw new Error(
            `CRXJS does not support Manifest v${manifest.manifest_version}, please use Manifest v3`,
          )

        /* ------- CONFIGURE PRE-BUNDLED DEPENDENCIES ------ */

        if (env.command === 'serve') {
          // Vite should crawl manifest entry files
          const {
            contentScripts: js,
            background: sw,
            html,
          } = await manifestFiles(manifest, { cwd: config.root })
          const { entries = [] } = config.optimizeDeps ?? {}
          // Vite ignores build inputs if optimize deps has explicit entries,
          // so we need to merge both to include extra HTML files
          let { input = [] } = config.build?.rollupOptions ?? {}
          if (typeof input === 'string') input = [input]
          else input = Object.values(input)
          input = input.map((f) => {
            let result = f
            if (isAbsolute(f)) {
              result = relative(config.root ?? process.cwd(), f)
            }
            return result
          })
          // Merging explicit entries and build inputs
          const set = new Set<string>([entries, input].flat())
          for (const x of [js, sw, html].flat()) set.add(x)

          return {
            ...config,
            optimizeDeps: {
              ...config.optimizeDeps,
              entries: [...set],
            },
          }
        }
      },
      buildStart(options) {
        if (options.plugins) plugins = options.plugins as CrxPlugin[]
      },
    },
    {
      name: 'crx:manifest-loader',
      enforce: 'pre',
      buildStart(options) {
        if (typeof options.input !== 'undefined' && !('ssr' in this)) {
          refId = this.emitFile({
            type: 'chunk',
            id: manifestId,
            name: 'crx-manifest.js',
            preserveSignature: 'strict',
          })
        }
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
      enforce: 'pre',
      options({ input, ...options }) {
        let finalInput = input
        if (isString(input) && input.endsWith('index.html')) {
          finalInput = stubId
        }

        // don't emit extra html files during serve
        if (config.command === 'serve')
          if (Array.isArray(input)) {
            finalInput = input.filter((x) => !x.endsWith('.html'))
          } else if (typeof input === 'object') {
            for (const [key, value] of Object.entries(input))
              if (value.endsWith('.html')) delete input[key]
          }

        /**
         * Rollup requires an initial input, but we don't need it By using a
         * stub instead of the default input, we can avoid extending complicated
         * inputs and easily find the manifest in crx:manifest#generateBundle
         * using a ref id.
         */
        return { input: finalInput, ...options }
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

        /* ----------- EMIT SCRIPTS DURING BUILD ----------- */

        if (config.command === 'serve') {
          // vite serve file writer only emits content scripts
          // - html files come directly from vite dev server
          // - service worker comes from vite dev server via loader file
          if (manifest.content_scripts)
            for (const { js = [], matches = [] } of manifest.content_scripts)
              for (const id of js) {
                contentScripts.set(
                  prefix('/', id),
                  formatFileData({
                    type: 'loader',
                    id,
                    matches,
                    refId: hashScriptId({ type: 'loader', id }),
                    fileName: getFileName({ type: 'loader', id }),
                  }),
                )
              }
        } else {
          // vite build emits content scripts, html files and service worker
          if (manifest.content_scripts)
            for (const { js = [], matches = [] } of manifest.content_scripts)
              for (const file of js) {
                const id = join(config.root, file)
                const refId = this.emitFile({
                  type: 'chunk',
                  id,
                  name: basename(file),
                })
                contentScripts.set(
                  file,
                  formatFileData({
                    type: 'loader',
                    id: file,
                    refId,
                    matches,
                  }),
                )
              }

          if (manifest.background?.service_worker) {
            const file = manifest.background.service_worker
            const id = join(config.root, file)
            const refId = this.emitFile({
              type: 'chunk',
              id,
              name: basename(file),
            })
            manifest.background.service_worker = refId
          }

          for (const file of htmlFiles(manifest)) {
            const id = join(config.root, file)
            this.emitFile({
              type: 'chunk',
              id,
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

        if (config.command === 'serve') {
          // plugin-background emits service worker loader in renderCrxManifest
          // vite dev server sends html files through local host
          if (manifest.content_scripts)
            for (const script of manifest.content_scripts) {
              script.js = script.js?.map((id) =>
                getFileName({ id, type: 'loader' }),
              )
            }
        } else {
          // transform hook emits files and replaces in manifest with ref ids
          // update background service worker filename from ref
          // service worker not emitted during development, so don't update file name
          if (manifest.background?.service_worker) {
            const ref = manifest.background.service_worker
            const name = this.getFileName(ref)
            manifest.background.service_worker = name
          }

          // update content script file names from refs
          // TODO: emit and parse css
          manifest.content_scripts = manifest.content_scripts?.map(
            ({ js = [], ...rest }) => {
              return {
                js: js.map((id) => {
                  const script = contentScripts.get(id)
                  const fileName = script?.loaderName ?? script?.fileName
                  if (typeof fileName === 'undefined')
                    throw new Error(
                      `Content script fileName is undefined: "${id}"`,
                    )
                  return fileName
                }),
                ...rest,
              }
            },
          )
        }

        /* ------------ RUN MANIFEST RENDER HOOK ----------- */

        // this appears to run after generateBundle since this is the last plugin
        for (const plugin of plugins) {
          try {
            const m = structuredClone(manifest)
            const result = await plugin.renderCrxManifest?.call(this, m, bundle)
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
          'webAccessibleResources',
        ]
        const files = await manifestFiles(manifest, { cwd: config.root })
        await Promise.all(
          assetTypes
            .map((k) => files[k])
            .flat()
            .map(async (f) => {
              // copy an asset if it is missing from the bundle
              if (typeof bundle[f] === 'undefined') {
                // get assets from project root or from public dir
                let filename = join(config.root, f)
                if (!existsSync(filename)) filename = join(config.publicDir, f)
                if (!existsSync(filename))
                  throw new Error(
                    `ENOENT: Could not load manifest asset "${f}".
Manifest assets must exist in one of these directories:
Project root: "${config.root}"
Public dir: "${config.publicDir}"`,
                  )

                this.emitFile({
                  type: 'asset',
                  fileName: f,
                  // TODO: cache source buffer
                  source: await readFile(filename),
                })
              }
            }),
        )

        /* ---------- SETUP HTML PLACEHOLDER FILES --------- */

        if (config.command === 'serve' && files.html.length) {
          const refId = this.emitFile({
            type: 'asset',
            name: 'precontroller.js',
            source: precontrollerJs,
          })
          const precontrollerJsName = this.getFileName(refId)
          files.html.map((f) =>
            this.emitFile({
              type: 'asset',
              fileName: f,
              source: precontrollerHtml.replace(
                '%SCRIPT%',
                `/${precontrollerJsName}`,
              ),
            }),
          )
        }

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
