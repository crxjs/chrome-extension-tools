import type { ConfigEnv } from 'vite'
import type { ManifestV3, WebAccessibleResourceByMatch } from './manifest'

export type ManifestV3Export = ManifestV3 | Promise<ManifestV3> | ManifestV3Fn

export type ManifestV3Fn = (env: ConfigEnv) => ManifestV3 | Promise<ManifestV3>

export const defineManifest = (manifest: ManifestV3Export): ManifestV3Export =>
  manifest

/**
 * Content script resources like CSS and image files must be declared in the
 * manifest under `web_accessible_resources`. Manifest V3 uses a match pattern
 * to narrow the origins that can access a Chrome CRX resource.
 *
 * Content script resources use the same match pattern as the content script for
 * web accessible resources.
 *
 * You don't need to define a match pattern for dynamic content script
 * resources, but if you want to do so, you can use the helper function
 * `defineDynamicResource` to define your web accessible resources in a
 * TypeScript file:
 *
 * ```typescript
 * import { crx, defineManifest, defineDynamicResource }
 * const manifest = defineManifest({
 *   "web_accessible_resources": [
 *     defineDynamicResource({
 *       matches: ["https://example.com/*", "file:///*.mp3", "..."]
 *       use_dynamic_url?: true
 *     })
 *   ]
 * })
 * ```
 */
export const defineDynamicResource = ({
  matches = ['http://*/*', 'https://*/*'],
  use_dynamic_url = false,
}: Omit<
  WebAccessibleResourceByMatch,
  'resources'
>): WebAccessibleResourceByMatch => ({
  matches,
  resources: [DYNAMIC_RESOURCE],
  use_dynamic_url,
})

export const DYNAMIC_RESOURCE = '<dynamic_resource>' as const
