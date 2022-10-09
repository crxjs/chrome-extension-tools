import { OutputChunk } from 'rollup'
import { Manifest as ViteManifest } from 'vite'
import { compileFileResources } from './compileFileResources'
import { contentScripts } from './contentScripts'
import {
  getMatchPatternOrigin,
  isResourceByMatch,
  parseJsonAsset,
  _debug,
} from './helpers'
import {
  WebAccessibleResourceById,
  WebAccessibleResourceByMatch,
} from './manifest'
import { CrxPluginFn } from './types'

const debug = _debug('web-acc-res')

export const pluginWebAccessibleResources: CrxPluginFn = () => {
  return [
    {
      name: 'crx:web-accessible-resources',
      apply: 'serve',
      enforce: 'post',
      renderCrxManifest(manifest) {
        // set default value for web_accessible_resources
        manifest.web_accessible_resources =
          manifest.web_accessible_resources ?? []

        // remove dynamic resources placeholder
        manifest.web_accessible_resources = manifest.web_accessible_resources
          .map(({ resources, ...rest }) => ({
            resources: resources.filter((r) => r !== '<dynamic_resource>'),
            ...rest,
          }))
          .filter(({ resources }) => resources.length)

        // during development don't do specific resources
        manifest.web_accessible_resources.push({
          // change the extension origin on every reload
          use_dynamic_url: true,
          // all web origins can access
          matches: ['<all_urls>'],
          // all resources are web accessible
          resources: ['**/*', '*'],
        })

        return manifest
      },
    },
    {
      name: 'crx:web-accessible-resources',
      apply: 'build',
      enforce: 'post',
      config({ build, ...config }, { command }) {
        return { ...config, build: { ...build, manifest: command === 'build' } }
      },
      renderCrxManifest(manifest, bundle) {
        const { web_accessible_resources: _war = [] } = manifest
        const dynamicScriptMatches = new Set<string>()
        let dynamicScriptDynamicUrl = true
        const web_accessible_resources: typeof _war = []
        for (const r of _war) {
          const i = r.resources.indexOf('<dynamic_script>')
          if (i > -1 && isResourceByMatch(r)) {
            r.resources = r.resources.slice(i, 1)
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
          const viteManifest = parseJsonAsset<ViteManifest>(
            bundle,
            'manifest.json',
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
                    { chunks: bundleChunks, files: viteFiles },
                  )

                  // loader files import the entry, so entry file must be web accessible
                  if (type === 'loader') imports.add(fileName)

                  const resource:
                    | WebAccessibleResourceById
                    | WebAccessibleResourceByMatch = {
                    matches: isDynamicScript
                      ? [...dynamicScriptMatches]
                      : matches,
                    resources: [...assets, ...imports, ...css],
                    use_dynamic_url: isDynamicScript
                      ? dynamicScriptDynamicUrl
                      : true,
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

          // remove imported module scripts
          for (const r of web_accessible_resources)
            if (isResourceByMatch(r))
              for (const res of r.resources)
                if (moduleScriptResources.has(res))
                  moduleScriptResources.delete(res)
          // add remaining top-level module imports (could be executed main world scripts)
          web_accessible_resources.push(...moduleScriptResources.values())
        }

        // TODO: combine redundant web accessible resources entries

        if (web_accessible_resources.length === 0)
          delete manifest.web_accessible_resources
        else manifest.web_accessible_resources = web_accessible_resources

        return manifest
      },
    },
  ]
}
