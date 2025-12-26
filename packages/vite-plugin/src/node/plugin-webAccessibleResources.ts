import { OutputBundle, OutputChunk } from 'rollup'
import {
  Manifest as ViteManifest,
  ResolvedConfig,
} from 'vite'
import { compileFileResources } from './compileFileResources'
import { contentScripts } from './contentScripts'
import { DYNAMIC_RESOURCE } from './defineManifest'
import {
  getMatchPatternOrigin,
  isResourceByMatch,
  parseJsonAsset,
  _debug,
} from './helpers'

/**
 * Vite 5+ uses .vite/manifest.json, older versions use manifest.json.
 * We detect the path dynamically from the bundle rather than relying on
 * the imported Vite version, since the plugin's dependency version may
 * differ from the user's runtime Vite version.
 */
function getViteManifestPath(bundle: OutputBundle): string | undefined {
  if (bundle['.vite/manifest.json']) return '.vite/manifest.json'
  if (bundle['manifest.json']) return 'manifest.json'
  return undefined
}
import {
  WebAccessibleResourceById,
  WebAccessibleResourceByMatch,
} from './manifest'
import { getOptions } from './plugin-optionsProvider'
import type { CrxPluginFn, Browser } from './types'

const debug = _debug('web-acc-res')

export const pluginWebAccessibleResources: CrxPluginFn = () => {
  let config: ResolvedConfig
  let injectCss: boolean
  let browser: Browser
  let userWantsViteManifest: boolean | string | undefined

  return [
    {
      name: 'crx:web-accessible-resources',
      apply: 'serve',
      enforce: 'post',
      async config(config) {
        const opts = await getOptions(config)
        browser = opts.browser || 'chrome'
      },
      renderCrxManifest(manifest) {
        // set default value for web_accessible_resources
        manifest.web_accessible_resources =
          manifest.web_accessible_resources ?? []

        // remove dynamic resources placeholder
        manifest.web_accessible_resources = manifest.web_accessible_resources
          .map(({ resources, ...rest }) => ({
            resources: resources.filter((r) => r !== DYNAMIC_RESOURCE),
            ...rest,
          }))
          .filter(({ resources }) => resources.length)

        // during development don't specific resources
        const war: WebAccessibleResourceByMatch = {
          // all web origins can access
          matches: ['<all_urls>'],
          // all resources are web accessible
          resources: ['**/*', '*'],
          // change the extension origin on every reload
          use_dynamic_url: false,
        }

        if (browser === 'firefox') {
          // not allowed in FF b/c FF does this by default
          delete war.use_dynamic_url
        }

        manifest.web_accessible_resources.push(war)

        return manifest
      },
    },
    {
      name: 'crx:web-accessible-resources',
      apply: 'build',
      enforce: 'post',
      async config({ build, ...config }, { command }) {
        const opts = await getOptions(config)
        const contentScripts = opts.contentScripts || {}
        browser = opts.browser || 'chrome'
        injectCss = contentScripts.injectCss ?? true

        // Save the user's original manifest setting
        userWantsViteManifest = build?.manifest

        // Only force manifest generation if we're building - we need it to derive content script resources
        return { ...config, build: { ...build, manifest: command === 'build' } }
      },
      configResolved(_config) {
        config = _config
      },
      async renderCrxManifest(manifest, bundle) {
        const { web_accessible_resources: _war = [] } = manifest
        const dynamicScriptMatches = new Set<string>()
        let dynamicScriptDynamicUrl = false
        const web_accessible_resources: typeof _war = []
        for (const r of _war) {
          const i = r.resources.indexOf(DYNAMIC_RESOURCE)
          if (i > -1 && isResourceByMatch(r)) {
            r.resources = [...r.resources]
            r.resources.splice(i, 1)
            for (const p of r.matches) dynamicScriptMatches.add(p)
            dynamicScriptDynamicUrl = r.use_dynamic_url ?? false
          }
          if (r.resources.length > 0) web_accessible_resources.push(r)
        }
        if (dynamicScriptMatches.size === 0) {
          dynamicScriptMatches.add('http://*/*')
          dynamicScriptMatches.add('https://*/*')
        }

        // derive content script resources from vite file manifest
        if (contentScripts.size > 0) {
          // Detect the Vite manifest path dynamically from the bundle
          const manifestPath = getViteManifestPath(bundle)
          if (!manifestPath) {
            throw new Error(
              'Vite manifest not found in bundle. Expected .vite/manifest.json or manifest.json',
            )
          }

          const viteManifest = parseJsonAsset<ViteManifest>(
            bundle,
            manifestPath,
          )

          const viteFiles = new Map()
          for (const [, file] of Object.entries(viteManifest))
            viteFiles.set(file.file, file)
          if (viteFiles.size === 0) return null

          const bundleChunks = new Map<string, OutputChunk>()
          for (const chunk of Object.values(bundle))
            if (chunk.type === 'chunk') bundleChunks.set(chunk.fileName, chunk)

          const moduleScriptResources = new Map<
            string,
            WebAccessibleResourceByMatch | WebAccessibleResourceById
          >()

          // multiple entries for each content script, dedupe by key === id
          for (const [
            key,
            { id, fileName, matches, type, isDynamicScript = false },
          ] of contentScripts)
            if (key === id)
              if (isDynamicScript || matches.length)
                if (typeof fileName === 'undefined') {
                  throw new Error(
                    `Content script filename is undefined for "${id}"`,
                  )
                } else {
                  const { assets, css, imports } = compileFileResources(
                    fileName,
                    { chunks: bundleChunks, files: viteFiles, config },
                  )

                  // update content script resources for use by css plugin
                  contentScripts.get(key)!.css = [...css]

                  // loader files import the entry, so entry file must be web accessible
                  if (type === 'loader' || isDynamicScript)
                    imports.add(fileName)

                  const resource:
                    | WebAccessibleResourceById
                    | WebAccessibleResourceByMatch = {
                    matches: isDynamicScript
                      ? [...dynamicScriptMatches]
                      : matches,
                    resources: [...assets, ...imports],
                    use_dynamic_url: isDynamicScript
                      ? dynamicScriptDynamicUrl
                      : false,
                  }

                  if (isDynamicScript || !injectCss) {
                    resource.resources.push(...css)
                  }

                  if (resource.resources.length)
                    if (type === 'module') {
                      // add conditionally after loaders and iife's
                      moduleScriptResources.set(fileName, resource)
                    } else {
                      resource.matches = resource.matches.map(
                        getMatchPatternOrigin,
                      )
                      web_accessible_resources.push(resource)
                    }
                }

          // now we know loader and iife resources, can handle modules
          for (const r of web_accessible_resources)
            if (isResourceByMatch(r))
              // remove imported module scripts
              for (const res of r.resources) moduleScriptResources.delete(res)
          // add remaining top-level module imports (could be executed main world scripts)
          web_accessible_resources.push(...moduleScriptResources.values())
        }

        /* ---------- COMBINE REDUNDANT RESOURCES ---------- */

        const hashedResources = new Map<string, Set<string>>()
        const combinedResources: typeof web_accessible_resources = []
        for (const r of web_accessible_resources)
          if (isResourceByMatch(r)) {
            const { matches, resources, use_dynamic_url = false } = r
            const key = JSON.stringify([use_dynamic_url, matches.sort()])
            const combined = hashedResources.get(key) ?? new Set()
            for (const res of resources) combined.add(res)
            hashedResources.set(key, combined)
          } else {
            combinedResources.push(r)
          }
        for (const [key, resources] of hashedResources)
          if (resources.size > 0) {
            const [use_dynamic_url, matches]: [boolean, string[]] =
              JSON.parse(key)
            combinedResources.push({
              matches,
              resources: [...resources],
              use_dynamic_url,
            })
          }

        /* ------------- BROWSER COMPATIBILITY ------------- */
        if (browser === 'firefox') {
          for (const war of combinedResources) {
            delete war.use_dynamic_url
          }
        }

        /* -------------- INCLUDE SOURCEMAPS --------------- */
        for (const war of combinedResources) {
          const resourcesWithMaps = []
          for (const res of war.resources) {
            resourcesWithMaps.push(res)
            if (bundle[res]?.type === 'chunk') {
              const chunk = bundle[res] as OutputChunk & {
                // OutputChunk.sourcemapFileName available in Vite >=5 (Rollup 3.29).
                sourcemapFileName: string
              }
              if (chunk.map) {
                const sourcemapFileName =
                  chunk.sourcemapFileName || `${chunk.fileName}.map`
                // Include sourcemap if it exists in the bundle or if sourcemaps are enabled in config
                // (older Vite versions may not include sourcemap files in the bundle object)
                if (
                  sourcemapFileName in bundle ||
                  config.build.sourcemap === true
                ) {
                  resourcesWithMaps.push(sourcemapFileName)
                }
              }
            }
          }
          war.resources = resourcesWithMaps
        }

        /* --------------- CLEAN UP MANIFEST --------------- */

        if (combinedResources.length === 0)
          delete manifest.web_accessible_resources
        else manifest.web_accessible_resources = combinedResources

        // If the user didn't explicitly enable build.manifest, remove the Vite manifest
        // from the bundle to keep the distribution clean
        if (!userWantsViteManifest) {
          // Vite 5+ uses .vite/manifest.json, older versions use manifest.json
          // Check both paths since the imported version might not match the runtime version
          const manifestPaths = ['.vite/manifest.json', 'manifest.json']
          for (const manifestPath of manifestPaths) {
            if (bundle[manifestPath]) {
              debug(
                'Removing Vite manifest: %s (userWantsViteManifest=%s)',
                manifestPath,
                userWantsViteManifest,
              )
              delete bundle[manifestPath]
            }
          }
        }

        return manifest
      },
    },
  ]
}
