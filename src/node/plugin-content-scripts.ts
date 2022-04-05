import contentHmrPort from 'client/es/hmr-content-port.ts?client'
import contentDevLoader from 'client/iife/content-dev-loader.ts?client'
import contentProLoader from 'client/iife/content-pro-loader.ts?client'
import MagicString from 'magic-string'
import { OutputAsset } from 'rollup'
import { Manifest, ManifestChunk, ViteDevServer } from 'vite'
import { createHash, isResourceByMatch, isString, _debug } from './helpers'
import {
  WebAccessibleResourceById,
  WebAccessibleResourceByMatch,
} from './manifest'
import { parse } from './path'
import { CrxPluginFn } from './types'
import { contentHmrPortId, preambleId } from './virtualFileIds'
import injector from 'connect-injector'
import { filesReady, rebuildFiles } from './plugin-fileWriter--events'

interface Resources {
  assets: Set<string>
  css: Set<string>
  imports: Set<string>
}

const dynamicScriptRegex =
  /^import (.+?) from ['"](.+?)\?script&?(loader|module|iife)?['"];?$/gm

type DynamicScriptType = 'loader' | 'module' | 'iife'
interface DynamicScriptData {
  id: string
  type: DynamicScriptType
  fileName?: string
  refId?: string
  loaderRefId?: string
  loaderName?: string
}
const scriptTypes: DynamicScriptType[] = ['module', 'iife', 'loader']
function isDynamicScriptType(x: string): x is DynamicScriptType {
  return scriptTypes.includes(x as DynamicScriptType)
}

function getTypeId(input: { type: DynamicScriptType; id: string }) {
  return createHash(JSON.stringify(input), 8)
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
export const pluginResources: CrxPluginFn = ({ contentScripts = {} }) => {
  const { hmrTimeout = 5000, injectCss = true } = contentScripts
  const dynamicScriptRefIdsByModule = new Map<string, Set<string>>()
  const dynamicScriptsByRefId = new Map<string, DynamicScriptData>()
  const dynamicScriptsByTypeId = new Map<string, DynamicScriptData>()
  const dynamicScriptsByLoaderRefId = new Map<string, DynamicScriptData>()

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
      async fileWriterStart(_server) {
        server = _server
        port = server.config.server.port!.toString()
        if (
          process.env.NODE_ENV !== 'test' &&
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
      name: 'crx:dynamic-scripts',
      apply: 'serve',
      configureServer(server) {
        server.middlewares.use(
          injector(
            (req, res) => {
              if (!req.url || req.url.includes('node_modules')) return false

              const contentType = [res.getHeader('Content-Type')]
                .flat()
                .filter(isString)
              return contentType.some((t) => t.includes('javascript'))
            },
            // http requests are delayed until content scripts are available on disk
            async (content, req, res, callback) => {
              const code = isString(content) ? content : content.toString()
              if (code.includes('import.meta.CRX_DYNAMIC_SCRIPT_')) {
                // TODO: get all typeIds
                // TODO: check status of typeIds
                const matches = Array.from(
                  code.matchAll(/import.meta.CRX_DYNAMIC_SCRIPT_(.+?);/g),
                )
                const magic = new MagicString(code)
                for (const m of matches)
                  if (typeof m.index === 'number') {
                    const [statement, typeId] = m
                    // data was set in transform hook
                    const data = dynamicScriptsByTypeId.get(typeId)!
                    // build is in progress
                    if (data.refId) await filesReady()
                    // script was added during build, rebuild
                    if (!data.fileName) await rebuildFiles()
                    // something went wrong, surface the error
                    if (!data.fileName)
                      throw new Error(
                        `Could not get URL for dynamic script "${data.id}"`,
                      )

                    magic.overwrite(
                      m.index,
                      m.index + statement.length,
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
      async transform(code, importer) {
        dynamicScriptRegex.lastIndex = 0
        if (dynamicScriptRegex.test(code)) {
          const magic = new MagicString(code)
          dynamicScriptRegex.lastIndex = 0
          for (const m of code.matchAll(dynamicScriptRegex))
            if (typeof m.index === 'number') {
              const [statement, varName, scriptName, type = 'loader'] = m
              if (!isDynamicScriptType(type)) {
                throw new Error(
                  `Unsupported dynamic script type "${type}" (imported in file: ${importer})`,
                )
              } else if (type === 'iife') {
                throw new Error(
                  `Dynamic script format IIFE is unimplemented (imported in file: ${importer})`,
                )
              }

              const { id = scriptName } =
                (await this.resolve(scriptName, importer)) ?? {}

              const typeId = getTypeId({ type, id })
              const data = dynamicScriptsByTypeId.get(typeId) ?? {
                type,
                id,
              }
              dynamicScriptsByTypeId.set(typeId, data)

              magic.overwrite(
                m.index,
                m.index + statement.length,
                `var ${varName} = import.meta.CRX_DYNAMIC_SCRIPT_${typeId};`,
              )
            }
          return { code: magic.toString(), map: magic.generateMap() }
        }
        return null
      },
    },
    {
      name: 'crx:dynamic-scripts',
      apply: 'build',
      buildStart() {
        dynamicScriptsByLoaderRefId.clear()
        dynamicScriptsByRefId.clear()
        for (const [, data] of dynamicScriptsByTypeId) {
          if (data.type === 'iife') {
            // TODO: bundle as iife here, emit as asset, no support for vite special features
            continue
          } else {
            data.refId = this.emitFile({ type: 'chunk', id: data.id })
            dynamicScriptsByRefId.set(data.refId, data)
          }

          if (data.type === 'loader') {
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
      },
      async transform(code, importer) {
        if (this.meta.watchMode) {
          if (code.includes('import.meta.CRX_DYNAMIC_SCRIPT_')) {
            const magic = new MagicString(code)
            const refIds = new Set<string>()
            for (const m of code.matchAll(
              /import.meta.CRX_DYNAMIC_SCRIPT_(.+?);/g,
            ))
              if (typeof m.index === 'number') {
                const [statement, typeId] = m
                const data = dynamicScriptsByTypeId.get(typeId)!
                if (!data.refId) {
                  if (data.type === 'iife') {
                    // TODO: bundle as iife here, emit as asset, no support for vite special features
                    continue
                  } else {
                    data.refId = this.emitFile({ type: 'chunk', id: data.id })
                    dynamicScriptsByRefId.set(data.refId, data)
                  }

                  if (data.type === 'loader') {
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

                refIds.add(data.refId)

                const finalRefId = data.loaderRefId ?? data.refId
                magic.overwrite(
                  m.index,
                  m.index + statement.length,
                  `import.meta.ROLLUP_FILE_URL_${finalRefId};`,
                )
              }
            dynamicScriptRefIdsByModule.set(importer, refIds)
            return { code: magic.toString(), map: magic.generateMap() }
          }
        } else {
          dynamicScriptRegex.lastIndex = 0
          if (dynamicScriptRegex.test(code)) {
            const magic = new MagicString(code)
            const refIds = new Set<string>()
            dynamicScriptRegex.lastIndex = 0
            for (const m of code.matchAll(dynamicScriptRegex))
              if (typeof m.index === 'number') {
                const [statement, varName, scriptName, type = 'loader'] = m
                if (!isDynamicScriptType(type))
                  throw new Error(
                    `Unsupported dynamic script type "${type}" (imported in file: ${importer})`,
                  )

                const { id = scriptName } =
                  (await this.resolve(scriptName, importer)) ?? {}

                const data = dynamicScriptsByTypeId.get(`${type}::${id}`) ?? {
                  type,
                  id,
                }
                dynamicScriptsByTypeId.set(`${type}::${id}`, data)

                if (!data.refId) {
                  if (type === 'iife') {
                    // TODO: bundle as iife here, emit as asset, no support for vite special features
                    throw new Error(
                      `Dynamic script format IIFE is unimplemented (imported in file: ${importer})`,
                    )
                  } else {
                    data.refId = this.emitFile({ type: 'chunk', id })
                    dynamicScriptsByRefId.set(data.refId, data)
                  }

                  if (type === 'loader') {
                    data.loaderRefId = this.emitFile({
                      type: 'asset',
                      name: `content-script-loader.${
                        parse(scriptName).name
                      }.js`,
                      // unset source causes Rollup error "Plugin error - Unable to get file name for asset..."
                      // we're referencing it in `import.meta.ROLLUP_FILE_URL_` below and Rollup wants to generate a hash
                      source: id, // set real source in generateBundle
                    })
                    dynamicScriptsByLoaderRefId.set(data.loaderRefId, data)
                  }
                }

                refIds.add(data.refId)

                magic.overwrite(
                  m.index,
                  m.index + statement.length,
                  `var ${varName} = import.meta.ROLLUP_FILE_URL_${
                    data.loaderRefId ?? data.refId
                  };`,
                )
              }
            dynamicScriptRefIdsByModule.set(importer, refIds)
            return { code: magic.toString(), map: magic.generateMap() }
          }
        }
        return null
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

        for (const [typeId, data] of dynamicScriptsByTypeId)
          if (data.refId && data.loaderRefId)
            try {
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
            } catch (error) {
              // TODO: not sure if we need this?
              // this.getFileName threw b/c dynamic script was removed
              dynamicScriptsByRefId.delete(data.refId)
              dynamicScriptsByLoaderRefId.delete(data.loaderRefId)
              dynamicScriptsByTypeId.delete(typeId)
            }

        /* ------- UPDATE DATA FOR SERVER MIDDLEWARE ------- */

        for (const data of dynamicScriptsByTypeId.values()) {
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
      name: 'crx:content-script-resources',
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
            // during development do things faster
            manifest.web_accessible_resources.push({
              // change the extension origin on every reload
              use_dynamic_url: true,
              // all web origins can access
              matches: ['<all_urls>'],
              // all resources are web accessible
              resources: ['**/*', '*'],
            })
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

            const dynamicScriptNames = new Set<string>()
            for (const [, { fileName, type }] of dynamicScriptsByRefId)
              if (fileName && type === 'loader')
                dynamicScriptNames.add(fileName)

            /* ------------ CONTENT SCRIPT FUNCTIONS ----------- */

            const getChunkResources = (chunk: typeof bundle[string]) => {
              const chunks = new Set<string>()
              const assets = new Set<string>()
              if (chunk.type === 'asset') return { chunks, assets }

              const { modules, imports, dynamicImports } = chunk
              for (const i of [...imports, ...dynamicImports]) chunks.add(i)

              const dynamicScripts = Object.keys(modules)
                .filter((m) => dynamicScriptRefIdsByModule.has(m))
                .map((m) => dynamicScriptRefIdsByModule.get(m)!)
                .map((set) => [...set])
                .flat()
                .map((m) => {
                  return this.getFileName(m)
                })

              for (const id of dynamicScripts) {
                const chunk = bundle[id]
                if (chunk.type === 'chunk') chunks.add(id)
                else assets.add(id)
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
                      manifest.web_accessible_resources.push(resource)
                    }
                  }

            const dynamicResourceSet = new Set<string>()
            for (const name of dynamicScriptNames) {
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
          const war = manifest.web_accessible_resources
          manifest.web_accessible_resources = []
          const map = new Map<string, Set<string>>()
          for (const r of war)
            if (isResourceByMatch(r)) {
              // combine resources that share match patterns
              const { matches, resources, use_dynamic_url = false } = r
              const key = [use_dynamic_url, matches.sort()]
                .map((x) => JSON.stringify(x))
                .join('::')
              const set = map.get(key) ?? new Set()
              resources.forEach((r) => set.add(r))
              map.set(key, set)
            } else {
              // don't touch resources by CRX_id
              manifest.web_accessible_resources.push(r)
            }
          // rebuild combined resources
          for (const [key, set] of map) {
            const [use_dynamic_url, matches] = key
              .split('::')
              .map((x) => JSON.parse(x)) as [boolean, string[]]
            manifest.web_accessible_resources.push({
              matches,
              resources: [...set],
              use_dynamic_url,
            })
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
