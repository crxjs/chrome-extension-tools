import { set } from 'lodash'
import { OutputAsset, OutputChunk } from 'rollup'
import type {
  Manifest as ViteFilesManifest,
  ManifestChunk,
} from 'vite'
import { isChunk } from './helpers'
import { relative } from './path'
import { importedResourcePrefix } from './plugin-importedResources'
import { getRpceAPI, stubUrl } from './plugin_helpers'
import { CrxPlugin, FileType, isMV2, Manifest } from './types'

/**
 * Content script resources like CSS and image files must be declared
 * in the manifest under `web_accessible_resources`. MV3 uses a match pattern
 * to narrow the origins that can access a Chrome Extension resource.
 *
 * Content scripts declared in the manifest use the same match pattern
 * as the content script for web accessible resources. Dynamic content scripts
 * use the default `["http://*\/*", "https://*\/*"]`, but you can add this
 * placeholder to a `web_accessible_resources` entry in an MV3 manifest
 * to narrow the match pattern for dynamic content script resources:
 *
 * ```json
 * {
 *   "web_accessible_resources": [{
 *     "resources": ["<dynamic_scripts>"],
 *     "matches": ["https://google.com/*", "file:///*.mp3", "..."]
 *   }]
 * }
 * ```
 */
export const dynamicScriptPlaceholder = '<dynamic_scripts>'

/**
 * Handles imported resources for content scripts.
 * - Supports both declared and dynamic content scripts
 * - Adds imported CSS files to content scripts in manifest
 * - Adds imported assets and scripts to web_accessible_resources
 */
export const contentScriptResources = (): CrxPlugin => {
  return {
    name: 'content-script-resources',
    apply: 'build',
    config(config) {
      set(config, 'build.manifest', true)
      return config
    },
    configResolved({ plugins }) {
      const api = getRpceAPI(plugins)
      const viteManifest = plugins.find(
        ({ name }) => name === 'vite:manifest',
      )!

      const realHook = viteManifest.generateBundle!
      viteManifest.generateBundle = async function (
        options,
        bundle,
        isWrite,
      ) {
        let filesData: ViteFilesManifest
        await realHook.call(
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

        const manifestAsset = bundle[
          'manifest.json'
        ] as OutputAsset
        const manifest: Manifest = JSON.parse(
          manifestAsset.source as string,
        )
        manifest.web_accessible_resources =
          manifest.web_accessible_resources ?? []

        const files = Object.entries(filesData!)
        if (!files.length) return

        const filesByName = files.reduce(
          (map, [, file]) => map.set(file.file, file),
          new Map<string, ManifestChunk>(),
        )
        const chunksById = Object.entries(bundle).reduce(
          (map, [outputName, chunk]) => {
            return isChunk(chunk) && chunk.facadeModuleId
              ? map.set(chunk.facadeModuleId, outputName)
              : map
          },
          new Map<string, string>(),
        )
        const getCrxImportsFromBundle = (
          modules: OutputChunk['modules'],
        ) => {
          const resources = Object.keys(modules)
            .filter((m) => m.startsWith(importedResourcePrefix))
            .map((m) => m.slice(importedResourcePrefix.length))
            .map((m) => stubUrl(m).pathname)

          const chunks = []
          const assets = []
          for (const id of resources) {
            const chunk = chunksById.get(id)
            if (chunk) chunks.push(chunk)
            else assets.push(relative(api.root, id))
          }

          return { chunks, assets }
        }

        // recurse through content script imports
        type Resources = {
          assets: Set<string>
          css: Set<string>
          imports: Set<string>
        }
        const getResources = (
          name: string,
          sets = {
            assets: new Set(),
            css: new Set(),
            imports: new Set(),
          } as Resources,
        ): Resources => {
          const {
            assets = [],
            css = [],
            dynamicImports = [],
            imports = [],
            file,
          } = filesByName.get(name) ?? // lookup by output filename
          filesData[name] ?? // lookup by vite manifest import key
          ({} as ViteFilesManifest) // if script is OutputAsset

          const chunk = bundle[file]
          const crxImports = isChunk(chunk)
            ? getCrxImportsFromBundle(chunk.modules)
            : { chunks: [], assets: [] }

          for (const a of [...assets, ...crxImports.assets])
            sets.assets.add(a)
          for (const c of css) sets.css.add(c)
          for (const i of [
            ...dynamicImports,
            ...imports,
            ...crxImports.chunks,
          ]) {
            sets.imports.add(i)
            getResources(i, sets)
          }

          return sets
        }

        // content scripts in the manifest
        const { content_scripts: scripts = [] } = manifest
        const declaredScriptResources = new Map<
          string,
          Resources
        >()
        for (const script of scripts) {
          for (const name of script.js ?? []) {
            const { assets, css, imports } =
              declaredScriptResources.get(name) ??
              getResources(name)
            declaredScriptResources.set(name, {
              assets,
              css,
              imports,
            })

            if (css.size) {
              script.css = script.css ?? []
              script.css.push(...css)
            }

            if (assets.size === 0) continue
            else if (isMV2(manifest)) {
              manifest.web_accessible_resources!.push(...assets)
            } else {
              manifest.web_accessible_resources!.push({
                // script.matches is always defined
                matches: script.matches!,
                resources: [...assets, ...imports],
              })
            }
          }
        }

        /**
         * Dynamic content scripts
         *
         * Imported CSS in dynamic content script:
         * - add file to web_accessible_resources
         * - add client code to importer
         *   - create style tag
         *   - support css modules
         *   - support HMR for css
         *
         * Use Cases:
         * - imported script is executed by a background page
         *   - importer is BACKGROUND
         * - imported script is executed by a script on an HTML page
         *   - importer is MODULE
         * - imported script is executed by a script in main world
         *   - importer is SCRIPT
         *   - is included in importer resources
         *   - covered by `getResources`
         *
         * Strategy:
         * - correlate emitted files to bundle chunks
         * - find imported scripts in those chunks
         * - run `getResources`
         * - MV2: just add the resources to web_accessible_resources
         * - MV3: use special placeholder in web_accessible_resources#resources
         *   - eg, "<dynamic_scripts>"
         *   - warn if placeholder is not found
         *   - could support a list of match patterns if needed
         *     - should be relative to root
         *     - eg, "<dynamic_scripts>:src/script1.ts,src/scripts/*.ts"
         *
         * ```jsonc
         * {
         *   web_accessible_resources: [{
         *     resources: ["<dynamic_scripts>"],
         *     matches: ["https://*", "file:///*.mp3", "..."]
         *   }]
         * }
         * ```
         */

        const executorFileTypes: FileType[] = [
          'BACKGROUND',
          'MODULE',
        ]
        const dynamicScripts = [...api.files.values()]
          .filter(({ fileType }) =>
            executorFileTypes.includes(fileType),
          )
          .map(({ refId }) => this.getFileName(refId))
          .map((fileName) => bundle[fileName] as OutputChunk)
          .flatMap(
            ({ modules }) =>
              getCrxImportsFromBundle(modules).chunks,
          )

        const dynamicScriptResources = new Map<
          string,
          Resources
        >()
        const resourceSet = new Set<string>()
        for (const script of dynamicScripts) {
          if (dynamicScriptResources.has(script)) continue
          const { assets, css, imports } =
            declaredScriptResources.get(script) ??
            getResources(script)
          dynamicScriptResources.set(script, {
            assets,
            css,
            imports,
          })
          for (const a of assets) resourceSet.add(a)
          for (const c of css) resourceSet.add(c)
          for (const i of imports) resourceSet.add(i)
        }

        if (resourceSet.size) {
          if (isMV2(manifest)) {
            manifest.web_accessible_resources!.push(
              ...resourceSet,
            )
          } else {
            let resource =
              manifest.web_accessible_resources!.find(
                ({ resources: [r] }) =>
                  r === dynamicScriptPlaceholder,
              )
            if (!resource) {
              this.warn(
                'Using default match pattern for dynamic script resources',
              )
              resource = {
                resources: [dynamicScriptPlaceholder],
                matches: ['http://*/*', 'https://*/*'],
              }
              manifest.web_accessible_resources!.push(resource)
            }

            resource.resources = [...resourceSet]
          }
        }

        // Clean up manifest
        if (!manifest.web_accessible_resources.length) {
          delete manifest.web_accessible_resources
        } else if (isMV2(manifest)) {
          manifest.web_accessible_resources = [
            ...new Set(manifest.web_accessible_resources),
          ]
        }

        manifestAsset.source = JSON.stringify(manifest)
      }
    },
  }
}
