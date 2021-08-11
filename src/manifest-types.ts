import { isPresent, Unpacked } from './helpers'

export type MV2 = chrome.runtime.Manifest & {
  manifest_version: 2
}

export type MV3 = chrome.runtime.Manifest & {
  manifest_version: 3
}

export type ContentScript = Unpacked<
  chrome.runtime.Manifest['content_scripts']
>

export type WebAccessibleResource = Unpacked<
  MV3['web_accessible_resources']
>

export function isMV2(
  m?: chrome.runtime.ManifestBase,
): m is chrome.runtime.ManifestV2 {
  if (!isPresent(m)) throw new TypeError('manifest is undefined')
  return m.manifest_version === 2
}

export function isMV3(
  m?: chrome.runtime.ManifestBase,
): m is chrome.runtime.ManifestV3 {
  if (!isPresent(m)) throw new TypeError('manifest is undefined')
  return m.manifest_version === 3
}
