import { simple } from 'acorn-walk'
import { readFile } from 'fs-extra'
import MagicString from 'magic-string'
import { OutputAsset } from 'rollup'
import { Manifest, ManifestChunk, ResolvedConfig } from 'vite'
import {
  isIdentifier,
  isLiteral,
  isMemberExpression,
  isPresent,
  isResourceByMatch,
  _debug,
} from './helpers'
import {
  WebAccessibleResourceById,
  WebAccessibleResourceByMatch,
} from './manifest'
import { join } from './path'
import { dynamicScripts } from './plugin-dynamicScripts'
import { AcornCallExpression, CrxPluginFn } from './types'

interface Resources {
  assets: Set<string>
  css: Set<string>
  imports: Set<string>
}

const debug = _debug('content-script-resources')

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
export const pluginResources: CrxPluginFn = ({ contentScripts = {} }) => {
  const { injectCss = true } = contentScripts
  const allRefIds = new Set<string>()
  const refIdsByModule = new Map<string, Set<string>>()
  const assetsToSetSource = new Map<string, string>()
  let config: ResolvedConfig
  return {
    name: 'crx:content-script-resources',
    apply: 'build',
    enforce: 'post',
    config({ build, ...config }, { command }) {
      return { ...config, build: { ...build, manifest: command === 'build' } }
    },
    configResolved(_config) {
      config = _config
    },
    async transform(code, id) {
      /**
       * What we just replace script imports with vars?
       *
       * 1. `import script from './script.ts?script'`
       * 2. `var script = import.meta.ROLLUP_FILE_URL_referenceId`
       * 3. `?script | ?script&loader` is dynamic content script w/ loader + HMR
       * 4. `?script&es` is ES module (main world script)
       * 5. `?script&iife` is IIFE script (works for either)
       * 6. No virtual modules!!
       * 7. No AST walkers
       */
      if (code.includes('runtime.getURL')) {
        const magic = new MagicString(code)
        const tree = this.parse(code)
        const moduleRefIds = new Set<string>()
        simple(tree, {
          CallExpression: (_node) => {
            const node = _node as AcornCallExpression
            if (
              isMemberExpression(node.callee) &&
              isIdentifier(node.callee.property) &&
              node.callee.property.name === 'getURL' &&
              isMemberExpression(node.callee.object) &&
              isIdentifier(node.callee.object.property) &&
              node.callee.object.property.name === 'runtime' &&
              // only emit string literal paths
              isLiteral(node.arguments[0]) &&
              typeof node.arguments[0].value === 'string'
            ) {
              const [literal] = node.arguments
              let refId = assetsToSetSource.get(literal.value)
              if (refId) {
                // asset was emitted previously
              } else if (/\.[jt]s$/.test(literal.value)) {
                refId = this.emitFile({
                  type: 'chunk',
                  id: literal.value,
                })
              } else {
                refId = this.emitFile({
                  type: 'asset',
                  name: literal.value,
                })
                assetsToSetSource.set(literal.value, refId)
              }
              allRefIds.add(refId)
              moduleRefIds.add(refId)
              magic.overwrite(
                literal.start,
                literal.end,
                `import.meta.ROLLUP_FILE_URL_${refId}`,
              )
            }
          },
        })

        refIdsByModule.set(id, moduleRefIds)
        return { code: magic.toString(), map: magic.generateMap() }
      }
      return null
    },
    async renderStart() {
      for (const [asset, refId] of assetsToSetSource) {
        const assetPath = join(config.root, asset)
        const buffer = await readFile(assetPath)
        this.setAssetSource(refId, buffer)
      }
      assetsToSetSource.clear()
    },
    resolveFileUrl({ referenceId, fileName }) {
      if (referenceId && allRefIds.has(referenceId)) {
        return `"${fileName}"`
      }
    },
    renderCrxManifest(manifest, bundle) {
      // set default value for web_accessible_resources
      manifest.web_accessible_resources =
        manifest.web_accessible_resources ?? []

      // add resources from declared and dynamic scripts
      if (manifest.content_scripts?.length || dynamicScripts.size)
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
          for (const [, { refId }] of dynamicScripts)
            if (refId) dynamicScriptNames.add(this.getFileName(refId))

          /* ------------ CONTENT SCRIPT FUNCTIONS ----------- */

          const getChunkResources = (chunk: typeof bundle[string]) => {
            const chunks = new Set<string>()
            const assets = new Set<string>()
            if (chunk.type === 'asset') return { chunks, assets }

            const { modules, imports, dynamicImports } = chunk
            for (const i of [...imports, ...dynamicImports]) chunks.add(i)

            const resources = Object.keys(modules)
              .map((m) => [
                ...(refIdsByModule.get(m) ?? new Set()),
                dynamicScripts.get(m)?.refId,
              ])
              .flat()
              .filter(isPresent)
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
  }
}
