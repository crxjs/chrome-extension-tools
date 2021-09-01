import { getViteServer } from '../viteAdaptor'
import { cloneObject } from './cloneObject'
import { generateFileNames } from './fileNames'

export function updateManifestV3(m: chrome.runtime.ManifestV3) {
  const manifest = cloneObject(m)

  if (manifest.background) {
    manifest.background.type = 'module'
  }

  if (getViteServer() && manifest.background?.service_worker) {
    const { wrapperFileName } = generateFileNames({
      fileName: manifest.background.service_worker,
    })

    manifest.background.service_worker = wrapperFileName
    manifest.background.type = 'module'
  }

  return manifest
}
