import { Manifest as ViteManifest } from 'vite'
import { compileFileResources } from './compileFileResources'
import { contentScripts } from './contentScripts'
import { getMatchPatternOrigin, parseJsonAsset, _debug } from './helpers'
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
        // set default value for web_accessible_resources
        manifest.web_accessible_resources =
          manifest.web_accessible_resources ?? []

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

          // multiple entries for each content script, dedupe by key === id
          for (const [key, { id, fileName, matches, type }] of contentScripts)
            if (key === id)
              if (matches?.length)
                if (typeof fileName === 'undefined') {
                  throw new Error(
                    `Content script filename is undefined for "${id}"`,
                  )
                } else {
                  const { assets, css, imports } = compileFileResources(
                    fileName,
                    viteFiles,
                  )

                  // loader files import the entry, so entry file must be web accessible
                  if (type === 'loader') imports.add(fileName)

                  const resource:
                    | WebAccessibleResourceById
                    | WebAccessibleResourceByMatch = {
                    matches,
                    resources: [...assets, ...imports, ...css],
                    use_dynamic_url: true,
                  }

                  if (resource.resources.length) {
                    resource.matches = resource.matches.map(
                      getMatchPatternOrigin,
                    )
                    manifest.web_accessible_resources.push(resource)
                  }
                }
        }

        // TODO: combine redundant web accessible resources entries

        if (manifest.web_accessible_resources.length === 0)
          delete manifest.web_accessible_resources

        return manifest
      },
    },
  ]
}
