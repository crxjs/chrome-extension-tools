import { isPresent, Unpacked } from './helpers'

export type ManifestV2 = Omit<
  chrome.runtime.ManifestV2,
  'name' | 'description' | 'version'
> &
  Partial<Pick<chrome.runtime.ManifestV2, 'name' | 'description' | 'version'>>

export type ManifestV3 = Omit<
  chrome.runtime.ManifestV3,
  'name' | 'description' | 'version'
> &
  Partial<Pick<chrome.runtime.ManifestV3, 'name' | 'description' | 'version'>>

export type ContentScript = Unpacked<chrome.runtime.Manifest['content_scripts']>

export type WebAccessibleResource = Unpacked<
  chrome.runtime.ManifestV3['web_accessible_resources']
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
