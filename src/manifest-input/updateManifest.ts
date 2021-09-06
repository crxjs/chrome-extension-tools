import { getViteServer } from '../viteAdaptor'
import { cloneObject } from './cloneObject'
import { generateFileNames } from './fileNames'

export function updateManifest(
  manifest: chrome.runtime.Manifest,
) {
  if (manifest.manifest_version === 3) {
    return updateManifestV3(manifest)
  } else {
    return updateManifestV2(manifest)
  }
}

export function updateManifestV3(
  m: chrome.runtime.ManifestV3,
): chrome.runtime.ManifestV3 {
  const manifest = cloneObject(m)
  const server = getViteServer()

  if (server) {
    manifest.name = `[FOR DEVELOPMENT ONLY] ${manifest.name}`
    manifest.description = `Do not submit this build to the Chrome Web Store. Uses the Vite Dev Server and will not work in production. ${manifest.description}`
  }

  if (manifest.background) {
    manifest.background.type = 'module'
  }

  if (server && manifest.background?.service_worker) {
    const { wrapperFileName } = generateFileNames({
      fileName: manifest.background.service_worker,
    })

    manifest.background.service_worker = wrapperFileName
  }

  return manifest
}

export function updateManifestV2(
  m: chrome.runtime.ManifestV2,
): chrome.runtime.ManifestV2 {
  const manifest = cloneObject(m)
  const server = getViteServer()

  if (server) {
    manifest.name = `[FOR DEVELOPMENT ONLY] ${manifest.name}`
    manifest.description = `Do not submit this build to the Chrome Web Store. Uses the Vite Dev Server and will not work in production. ${manifest.description}`
  }

  if (manifest.background?.scripts) {
    manifest.background.scripts =
      manifest.background.scripts.map((fileName) => {
        const { wrapperFileName } = generateFileNames({
          fileName,
        })

        return wrapperFileName
      })
  }

  return manifest
}
