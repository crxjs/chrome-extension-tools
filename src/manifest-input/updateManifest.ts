import { getViteServer } from '../viteAdaptor'
import { relative } from 'path'
import { ManifestInputPluginCache } from '../plugin-options'
import { cloneObject } from './cloneObject'
import { convertMatchPatterns } from './convertMatchPatterns'
import {
  chunkMatchPattern,
  getImportWrapperFileName,
} from './fileNames'

export function updateManifestV3(
  m: chrome.runtime.ManifestV3,
  cache: ManifestInputPluginCache,
) {
  const manifest = cloneObject(m)

  if (manifest.background) {
    manifest.background.type = 'module'
  }

  if (manifest.content_scripts) {
    const allMatches = manifest.content_scripts
      .flatMap(({ matches }) => matches ?? [])
      .concat(manifest.host_permissions ?? [])
      .map(convertMatchPatterns)

    const matches = Array.from(new Set(allMatches))
    const resources = [
      chunkMatchPattern,
      ...cache.contentScripts.map((x) =>
        relative(cache.srcDir!, x),
      ),
    ]

    manifest.content_scripts = manifest.content_scripts.map(
      (c) => ({
        ...c,
        js: c.js?.map(getImportWrapperFileName),
      }),
    )

    if (getViteServer() && manifest.background?.service_worker) {
      manifest.background.type = 'module'
      manifest.background.service_worker =
        getImportWrapperFileName(
          manifest.background.service_worker,
        )
    }

    manifest.web_accessible_resources =
      manifest.web_accessible_resources ?? []

    manifest.web_accessible_resources.push({
      resources,
      matches,
    })
  }

  return manifest
}
