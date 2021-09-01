import { getViteServer } from '../viteAdaptor'
import { cloneObject } from './cloneObject'
import { getImportWrapperFileName } from './fileNames'

export function updateManifestV3(m: chrome.runtime.ManifestV3) {
  const manifest = cloneObject(m)

  if (manifest.background) {
    manifest.background.type = 'module'
  }

  if (getViteServer() && manifest.background?.service_worker) {
    manifest.background.type = 'module'
    manifest.background.service_worker =
      getImportWrapperFileName(
        manifest.background.service_worker,
      )
  }

  return manifest
}
