import { OutputAsset } from 'rollup'
import { Manifest, ManifestChunk } from 'vite'
import { isResourceByMatch, isString, _debug } from './helpers'
import { dynamicScripts } from './plugin-contentScripts'
import { CrxPluginFn } from './types'

interface Resources {
  assets: Set<string>
  css: Set<string>
  imports: Set<string>
}

const pluginName = 'crx:resources'
const debug = _debug(pluginName)

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
 * to all urls. This is secure enough for our purposes b/c the CRX id is changed
 * randomly each session (including runtime reloads).
 *
 * You should always use the Chrome API to access CRX resources, since the CRX
 * id changes constantly during development (and during production if you set
 * `use_dynamic_url` to `true`). The dynamic id is not the CRX id visible in the
 * developer dashboard, it is a special resource id that you can access by
 * calling `chrome.runtime.getURL`.
 */
export const pluginResources: CrxPluginFn = () => {
  return {
    name: pluginName,
    apply: 'build',
    config({ build, ...config }, { mode }) {
      return { ...config, build: { ...build, manifest: mode !== 'watch' } }
    },
    renderCrxManifest(manifest, bundle) {
      // set default value for web_accessible_resources
      manifest.web_accessible_resources =
        manifest.web_accessible_resources ?? []

      // add resources from declared and dynamic scripts
      if (manifest.content_scripts?.length || dynamicScripts.size)
        if (this.meta.watchMode) {
          manifest.web_accessible_resources.push({
            // a content script from any url can access
            matches: ['<all_urls>'],
            // all resources are web accessible
            resources: ['**/*', '*'],
            // this is secure enough for development
            // b/c the CRX id is different each session
            use_dynamic_url: true,
          })
        } else {
          const vmAsset = bundle['manifest.json'] as OutputAsset
          if (!vmAsset) throw new Error('vite manifest is missing')
          const viteManifest: Manifest = JSON.parse(vmAsset.source as string)
          debug('vite manifest %O', viteManifest)
          if (Object.keys(viteManifest).length === 0) return

          const filesByName = new Map<string, ManifestChunk>()
          for (const file of Object.values(viteManifest))
            filesByName.set(file.file, file)

          const chunksById = new Map<string, string>()
          for (const [name, chunk] of Object.entries(bundle))
            if (chunk.type === 'chunk' && chunk.facadeModuleId)
              chunksById.set(chunk.facadeModuleId, name)

          const dynamicScriptNames = new Set<string>()
          for (const [, { refId }] of dynamicScripts)
            if (refId) dynamicScriptNames.add(this.getFileName(refId))

          const getChunkResources = (chunk: typeof bundle[string]) => {
            const chunks = new Set<string>()
            const assets = new Set<string>()
            if (chunk.type === 'asset') return { chunks, assets }

            const { modules, imports, dynamicImports } = chunk
            for (const i of [...imports, ...dynamicImports]) chunks.add(i)

            const resources = Object.keys(modules)
              .map((m) => dynamicScripts.get(m)?.refId)
              .filter(isString)
              .map((m) => this.getFileName(m))

            for (const id of resources) {
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

          const mainWorldScripts = new Set<string>()
          for (const script of manifest.content_scripts ?? [])
            if (script.js?.length)
              for (const name of script.js)
                if (script.matches?.length) {
                  const { assets, css, imports } = getResources(name)

                  for (const i of imports)
                    if (dynamicScriptNames.has(i)) mainWorldScripts.add(i)

                  imports.add(name)

                  // inject css through content script
                  if (css.size) {
                    script.css = script.css ?? []
                    script.css.push(...css)
                  }

                  if (assets.size + imports.size) {
                    manifest.web_accessible_resources.push({
                      matches: script.matches,
                      resources: [...assets, ...imports],
                      use_dynamic_url: true,
                    })
                  }
                }

          const dynamicResourceSet = new Set<string>()
          for (const name of dynamicScriptNames)
            if (!mainWorldScripts.has(name)) {
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
  }
}
