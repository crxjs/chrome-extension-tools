import contentHmrPort from 'client/es/hmr-content-port.ts'
import contentDevLoader from 'client/iife/content-dev-loader.ts'
import contentProLoader from 'client/iife/content-pro-loader.ts'
import injector from 'connect-injector'
import { createHash } from 'crypto'
import MagicString from 'magic-string'
import { OutputAsset, PluginContext } from 'rollup'
import { Manifest, ManifestChunk, ViteDevServer } from 'vite'
import {
  isResourceByMatch,
  isString,
  getMatchPatternOrigin,
  _debug,
} from '../helpers'
import {
  WebAccessibleResourceById,
  WebAccessibleResourceByMatch,
} from '../manifest'
import { parse } from '../path'
import { filesReady } from '../fileWriter'
import { crxRuntimeReload } from '../plugin-hmr'
import { CrxPluginFn } from '../types'
import { contentHmrPortId, preambleId } from '../virtualFileIds'

interface Resources {
  assets: Set<string>
  css: Set<string>
  imports: Set<string>
}

type DynamicScriptFormat = 'loader' | 'module' | 'iife'
interface DynamicScriptData {
  id: string
  importer: string
  scriptId: string
  finalId: string
  format: DynamicScriptFormat
  fileName?: string
  loaderName?: string
  loaderRefId?: string
  refId?: string
}
// const scriptTypes: DynamicScriptFormat[] = ['module', 'iife', 'loader']
// function isDynamicScriptFormat(x: string): x is DynamicScriptFormat {
//   return scriptTypes.includes(x as DynamicScriptFormat)
// }

function getScriptId({
  format,
  id,
}: {
  format: DynamicScriptFormat
  id: string
}) {
  return createHash('sha1')
    .update(format)
    .update(id)
    .digest('base64')
    .replace(/[^A-Za-z0-9]/g, '')
    .slice(0, 8)
}

const debug = _debug('content-scripts')

export const dynamicResourcesName = '<dynamic_resource>' as const

/**
 * This plugin creates `web_accessible_resources` entries for each declared
 * content script and one entry for all the dynamic content scripts, then
 * combines entries that share match patterns.
 *
 * This plugin leverages Vite's manifest feature to determine the exact
 * resources for each script. The Vite manifest is not emitted b/c we overwrite
 * it when we emit the CRX manifest.
 *
 * During development we use a dynamic CRX id and make all resources available
 * to all urls. This is secure enough for our purposes b/c the CRX origin is
 * changed randomly each runtime reload.
 */
export const pluginContentScripts: CrxPluginFn = ({
  contentScripts = {},
  browser = 'chrome',
}) => {
  const { hmrTimeout = 5000, injectCss = true } = contentScripts
  const dynamicScriptsById = new Map<string, DynamicScriptData>()
  const dynamicScriptsByLoaderRefId = new Map<string, DynamicScriptData>()
  const dynamicScriptsByRefId = new Map<string, DynamicScriptData>()
  const dynamicScriptsByScriptId = new Map<string, DynamicScriptData>()
  function emitDynamicScript(
    this: PluginContext,
    data: DynamicScriptData,
  ): void {
    if (data.format === 'iife') {
      throw new Error(
        `Dynamic script format IIFE is unimplemented (imported in file: ${data.importer})`.trim(),
      )
    } else {
      data.refId = this.emitFile({ type: 'chunk', id: data.id })
      dynamicScriptsByRefId.set(data.refId, data)
    }

    if (data.format === 'loader') {
      data.loaderRefId = this.emitFile({
        type: 'asset',
        name: `content-script-loader.${parse(data.id).name}.js`,
        // unset source causes Rollup error "Plugin error - Unable to get file name for asset..."
        // we're referencing it in `import.meta.ROLLUP_FILE_URL_` below and Rollup wants to generate a hash
        source: JSON.stringify(data), // set real source in generateBundle
      })
      dynamicScriptsByLoaderRefId.set(data.loaderRefId, data)
    }
  }
  async function resolveDynamicScript(
    this: PluginContext,
    _source: string,
    importer?: string,
  ) {
    if (importer && _source.includes('?script')) {
      const url = new URL(_source, 'stub://stub')
      if (url.searchParams.has('scriptId')) {
        const scriptId = url.searchParams.get('scriptId')!
        const { finalId } = dynamicScriptsByScriptId.get(scriptId)!
        return finalId
      } else if (url.searchParams.has('script')) {
        const [source] = _source.split('?')
        const resolved = await this.resolve(source, importer, {
          skipSelf: true,
        })
        if (!resolved)
          throw new Error(
            `Could not resolve dynamic script: "${_source}" from "${importer}"`,
          )
        const { id } = resolved

        let format: DynamicScriptFormat = 'loader'
        if (url.searchParams.has('module')) {
          format = 'module'
        } else if (url.searchParams.has('iife')) {
          format = 'iife'
        }

        const scriptId = getScriptId({ format, id })
        const finalId = `${id}?scriptId=${scriptId}`

        const data = dynamicScriptsByScriptId.get(scriptId) ?? {
          format,
          id,
          importer,
          scriptId,
          finalId,
        }
        dynamicScriptsByScriptId.set(scriptId, data)
        dynamicScriptsById.set(finalId, data)

        return finalId
      }
    }
  }
  function loadDynamicScript(this: PluginContext, id: string) {
    const data = dynamicScriptsById.get(id)
    if (data)
      return `export default import.meta.CRX_DYNAMIC_SCRIPT_${data.scriptId};`
  }

  let port: string
  let server: ViteDevServer

  let { preambleCode } = contentScripts
  let preambleRefId: string
  let contentClientRefId: string

  return [
    {
      name: 'crx:content-scripts-pre',
      apply: 'build',
      enforce: 'pre',
      async configureServer(_server) {
        server = _server
        port = server.config.server.port!.toString()
        if (
          typeof preambleCode === 'undefined' &&
          server.config.plugins.some(({ name }) =>
            name.toLowerCase().includes('react'),
          )
        ) {
          try {
            // rollup compiles this correctly for cjs output
            const react = await import('@vitejs/plugin-react')
            // auto config for react users
            preambleCode = react.default.preambleCode
          } catch (error) {
            preambleCode = false
          }
        }
      },
      buildStart() {
        if (this.meta.watchMode) {
          if (preambleCode) {
            preambleRefId = this.emitFile({
              type: 'chunk',
              id: preambleId,
              name: 'content-script-preamble.js',
            })
          }

          contentClientRefId = this.emitFile({
            type: 'chunk',
            id: '/@vite/client',
            name: 'content-script-client.js',
          })
        }
      },
      resolveId(source) {
        if (source === preambleId) return preambleId
        if (source === contentHmrPortId) return contentHmrPortId
      },
      load(id) {
        if (server && id === preambleId && typeof preambleCode === 'string') {
          const defined = preambleCode.replace(/__BASE__/g, server.config.base)
          return defined
        }

        if (id === contentHmrPortId) {
          const defined = contentHmrPort.replace(
            '__CRX_HMR_TIMEOUT__',
            JSON.stringify(hmrTimeout),
          )
          return defined
        }
      },
    },
    {
      name: 'crx:dynamic-scripts-load',
      apply: 'serve',
      enforce: 'pre',
      // this.meta.watchMode is true for server
      resolveId: resolveDynamicScript,
      load: loadDynamicScript,
    },
    {
      name: 'crx:dynamic-scripts-load',
      apply: 'build',
      enforce: 'pre',
      resolveId(id, importer) {
        // should not run on file writer
        if (!this.meta.watchMode)
          return resolveDynamicScript.call(this, id, importer)
      },
      load(id) {
        // should not run on file writer
        if (!this.meta.watchMode) return loadDynamicScript.call(this, id)
      },
    },
    {
      name: 'crx:dynamic-scripts-build',
      apply: 'build',
      buildStart() {
        dynamicScriptsByLoaderRefId.clear()
        dynamicScriptsByRefId.clear()
        for (const [, data] of dynamicScriptsByScriptId) {
          emitDynamicScript.call(this, data)
        }
      },
      async transform(code) {
        if (code.includes('import.meta.CRX_DYNAMIC_SCRIPT_')) {
          const match = code.match(/import.meta.CRX_DYNAMIC_SCRIPT_(.+?);/)!
          const index = match.index! // only undefined when match is entire string
          const [statement, scriptId] = match // only undefined when no groups
          const data = dynamicScriptsByScriptId.get(scriptId)!
          if (!data.refId) emitDynamicScript.call(this, data)
          const magic = new MagicString(code)
          magic.overwrite(
            index,
            index + statement.length,
            `import.meta.ROLLUP_FILE_URL_${data.loaderRefId ?? data.refId};`,
          )
          return { code: magic.toString(), map: magic.generateMap() }
        }
      },
      resolveFileUrl({ referenceId, fileName, moduleId }) {
        if (moduleId && referenceId)
          if (
            dynamicScriptsByRefId.has(referenceId) ||
            dynamicScriptsByLoaderRefId.has(referenceId)
          ) {
            return `"/${fileName}"`
          }
      },
      generateBundle(options, bundle) {
        const preambleName =
          this.meta.watchMode && preambleRefId
            ? this.getFileName(preambleRefId)
            : ''
        const contentClientName =
          this.meta.watchMode && contentClientRefId
            ? this.getFileName(contentClientRefId)
            : ''

        /* -------- SET DYNAMIC SCRIPT LOADER SOURCE ------- */

        for (const data of dynamicScriptsByScriptId.values()) {
          if (data.refId && data.loaderRefId) {
            const scriptName = this.getFileName(data.refId)
            const loaderName = this.getFileName(data.loaderRefId)

            const source = this.meta.watchMode
              ? contentDevLoader
                  .replace(/__PREAMBLE__/g, JSON.stringify(preambleName))
                  .replace(/__CLIENT__/g, JSON.stringify(contentClientName))
                  .replace(/__SCRIPT__/g, JSON.stringify(scriptName))
              : contentProLoader.replace(
                  /__SCRIPT__/g,
                  JSON.stringify(scriptName),
                )

            const asset = bundle[loaderName]
            if (asset?.type === 'asset') asset.source = source
          }
        }
      },
      writeBundle() {
        /* ------ CLEAN UP DATA FOR SERVER MIDDLEWARE ------ */
        for (const [, data] of dynamicScriptsByScriptId) {
          if (data.refId) {
            data.fileName = this.getFileName(data.refId)
            delete data.refId
          }
          if (data.loaderRefId) {
            data.loaderName = this.getFileName(data.loaderRefId)
            delete data.loaderRefId
          }
        }
      },
    },
    {
      name: 'crx:dynamic-scripts-serve',
      apply: 'serve',
      configureServer(server) {
        server.middlewares.use(
          injector(
            (req) => {
              return !!req.url?.includes('?scriptId')
            },
            // http requests are delayed until content scripts are available on disk
            async (content, req, res, callback) => {
              const code = isString(content) ? content : content.toString()
              if (code.includes('import.meta.CRX_DYNAMIC_SCRIPT_')) {
                const matches = Array.from(
                  code.matchAll(/import.meta.CRX_DYNAMIC_SCRIPT_(.+?);/g),
                ).map((m) => ({
                  statement: m[0],
                  index: m.index,
                  data: dynamicScriptsByScriptId.get(m[1])!,
                }))

                // build is in progress, wait
                if (matches.some(({ data }) => data.refId)) await filesReady()

                // some content scripts are new and don't exist on disk
                if (
                  matches.some(
                    ({ data }) => !(data.loaderName ?? data.fileName),
                  )
                ) {
                  // await rebuildFiles()
                  // new content scripts require a runtime reload
                  server.ws.send(crxRuntimeReload)
                }

                const magic = new MagicString(code)
                for (const { index, statement, data } of matches)
                  if (typeof index === 'number') {
                    magic.overwrite(
                      index,
                      index + statement.length,
                      `"/${data.loaderName ?? data.fileName}"`,
                    )
                  }

                callback(null, magic.toString())
              } else {
                callback(null, code)
              }
            },
          ),
        )
      },
    },
    {
      name: 'crx:∏content-script-resources',
      apply: 'build',
      enforce: 'post',
      config({ build, ...config }, { command }) {
        return { ...config, build: { ...build, manifest: command === 'build' } }
      },
      renderCrxManifest(manifest, bundle) {
        // set default value for web_accessible_resources
        manifest.web_accessible_resources =
          manifest.web_accessible_resources ?? []

        // add resources from declared and dynamic scripts
        if (manifest.content_scripts?.length || dynamicScriptsByRefId.size)
          if (this.meta.watchMode) {
            // remove dynamic resources placeholder
            manifest.web_accessible_resources =
              manifest.web_accessible_resources
                .map(({ resources, ...rest }) => ({
                  resources: resources.filter(
                    (r) => r !== dynamicResourcesName,
                  ),
                  ...rest,
                }))
                .filter(({ resources }) => resources.length)

            // during development don't specific resources
            const war: WebAccessibleResourceByMatch = {
              // all web origins can access
              matches: ['<all_urls>'],
              // all resources are web accessible
              resources: ['**/*', '*'],
            }

            if (browser !== 'firefox') {
              // change the extension origin on every reload
              // not allowed in FF b/c FF does this by default
              war.use_dynamic_url = true
            }

            manifest.web_accessible_resources.push(war)
          } else {
            const vmAsset = bundle['manifest.json'] as OutputAsset
            if (!vmAsset) throw new Error('vite manifest is missing')
            const viteManifest: Manifest = JSON.parse(vmAsset.source as string)
            debug('vite manifest %O', viteManifest)
            if (Object.keys(viteManifest).length === 0) return

            /* -------------- CONTENT SCRIPT DATA -------------- */

            const filesByName = new Map<string, ManifestChunk>()
            for (const file of Object.values(viteManifest))
              filesByName.set(file.file, file)

            const chunksById = new Map<string, string>()
            for (const [name, chunk] of Object.entries(bundle))
              if (chunk.type === 'chunk' && chunk.facadeModuleId)
                chunksById.set(chunk.facadeModuleId, name)

            /* ------------ CONTENT SCRIPT FUNCTIONS ----------- */

            const getChunkResources = (chunk: typeof bundle[string]) => {
              const chunks = new Set<string>()
              const assets = new Set<string>()
              if (chunk.type === 'asset') return { chunks, assets }

              const { dynamicImports, imports, modules } = chunk
              for (const i of dynamicImports) chunks.add(i)
              for (const i of imports) chunks.add(i)

              for (const id of Object.keys(modules))
                if (dynamicScriptsById.has(id)) {
                  const data = dynamicScriptsById.get(id)!
                  const fileName = this.getFileName(data.refId!)
                  const chunk = bundle[fileName]
                  if (chunk.type === 'chunk') chunks.add(fileName)
                  else assets.add(fileName)
                }

              return { chunks, assets }
            }

            const getResources = (
              name: string,
              sets: Resources = {
                assets: new Set(),
                css: new Set(),
                imports: new Set(),
              },
            ): Resources => {
              const {
                assets = [],
                css = [],
                dynamicImports = [],
                imports = [],
                file,
              } = filesByName.get(name) ?? // lookup by output filename
              viteManifest[name] ?? // lookup by vite manifest import key
              ({} as ManifestChunk) // if script is OutputAsset

              const chunk = bundle[file]
              if (chunk?.type === 'chunk') {
                const r = getChunkResources(chunk)
                assets.push(...r.assets)
                for (const chunk of r.chunks) {
                  sets.imports.add(chunk)
                  getResources(chunk, sets)
                }
              }

              for (const a of assets) sets.assets.add(a)
              for (const c of css) sets.css.add(c)
              for (const key of [...dynamicImports, ...imports]) {
                const i = viteManifest[key].file
                sets.imports.add(i)
                getResources(key, sets)
              }

              return sets
            }

            /* ---------------- PROCESS SCRIPTS ---------------- */

            for (const script of manifest.content_scripts ?? [])
              if (script.js?.length)
                for (const name of script.js)
                  if (script.matches?.length) {
                    const { assets, css, imports } = getResources(name)

                    imports.add(name)

                    const resource:
                      | WebAccessibleResourceById
                      | WebAccessibleResourceByMatch = {
                      matches: script.matches,
                      resources: [...assets, ...imports],
                      use_dynamic_url: true,
                    }

                    if (css.size)
                      if (injectCss) {
                        // inject css through content script
                        script.css = script.css ?? []
                        script.css.push(...css)
                      } else {
                        resource.resources.push(...css)
                      }

                    if (resource.resources.length) {
                      // chromium only uses origin of match pattern
                      resource.matches = resource.matches.map(
                        getMatchPatternOrigin,
                      )
                      manifest.web_accessible_resources.push(resource)
                    }
                  }

            const dynamicResourceSet = new Set<string>()
            for (const [refId, { format }] of dynamicScriptsByRefId)
              if (format === 'loader') {
                const name = this.getFileName(refId)
                const { assets, css, imports } = getResources(name)

                dynamicResourceSet.add(name)
                for (const a of assets) dynamicResourceSet.add(a)
                for (const c of css) dynamicResourceSet.add(c)
                for (const i of imports) dynamicResourceSet.add(i)
              }

            if (dynamicResourceSet.size) {
              let resource = manifest.web_accessible_resources!.find(
                ({ resources: [r] }) => r === dynamicResourcesName,
              )
              if (!resource) {
                resource = {
                  resources: [dynamicResourcesName],
                  matches: ['http://*/*', 'https://*/*'],
                }
                manifest.web_accessible_resources!.push(resource)
              }

              resource.resources = [...dynamicResourceSet]
            }
          }

        // clean up web_accessible_resources
        if (manifest.web_accessible_resources?.length) {
          const wars = manifest.web_accessible_resources
          manifest.web_accessible_resources = []
          const map = new Map<string, Set<string>>()
          for (const war of wars)
            if (isResourceByMatch(war)) {
              // combine resources that share match patterns
              const { matches, resources, use_dynamic_url = false } = war
              const key = [use_dynamic_url, matches.sort()]
                .map((x) => JSON.stringify(x))
                .join('::')
              const set = map.get(key) ?? new Set()
              resources.forEach((r) => set.add(r))
              map.set(key, set)
            } else {
              // FF does not allow the use_dynamic_url key b/c the urls are always
              // dynamic in FF
              if (browser === 'firefox' && 'use_dynamic_url' in war)
                delete war.use_dynamic_url

              // don't touch resources by CRX_id
              manifest.web_accessible_resources.push(war)
            }
          // rebuild combined resources
          for (const [key, set] of map) {
            const [use_dynamic_url, matches] = key
              .split('::')
              .map((x) => JSON.parse(x)) as [boolean, string[]]

            const war:
              | WebAccessibleResourceById
              | WebAccessibleResourceByMatch = {
              matches,
              resources: [...set],
            }

            // FF does not allow the use_dynamic_url key b/c the urls are always
            // dynamic in FF
            if (browser !== 'firefox') war.use_dynamic_url = use_dynamic_url

            manifest.web_accessible_resources.push(war)
          }
        } else {
          // array is empty or undefined
          delete manifest.web_accessible_resources
        }

        return manifest
      },
    },
    {
      name: 'crx:content-scripts-post',
      apply: 'build',
      enforce: 'post',
      renderCrxManifest(manifest, bundle) {
        if (this.meta.watchMode && typeof port === 'undefined')
          throw new Error('server port is undefined')

        const preambleName =
          this.meta.watchMode && preambleRefId
            ? this.getFileName(preambleRefId)
            : ''
        const contentClientName =
          this.meta.watchMode && contentClientRefId
            ? this.getFileName(contentClientRefId)
            : ''

        if (!manifest.content_scripts?.length && !dynamicScriptsByRefId.size) {
          delete bundle[contentClientName]
          return manifest
        }

        /* --------- APPLY DECLARED SCRIPT LOADERS --------- */

        manifest.content_scripts = manifest.content_scripts?.map(
          ({ js, ...rest }) => ({
            js: js?.map((f: string) => {
              const name = `content-script-loader.${parse(f).name}.js`
              const source = this.meta.watchMode
                ? contentDevLoader
                    .replace(/__PREAMBLE__/g, JSON.stringify(preambleName))
                    .replace(/__CLIENT__/g, JSON.stringify(contentClientName)!)
                    .replace(/__SCRIPT__/g, JSON.stringify(f))
                    .replace(/__TIMESTAMP__/g, JSON.stringify(Date.now()))
                : contentProLoader.replace(/__SCRIPT__/g, JSON.stringify(f))

              const refId = this.emitFile({
                type: 'asset',
                name,
                source,
              })

              return this.getFileName(refId)
            }),
            ...rest,
          }),
        )

        return manifest
      },
    },
  ]
}
