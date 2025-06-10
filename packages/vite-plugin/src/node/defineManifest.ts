import type { ConfigEnv } from 'vite'
import type { FirefoxManifestBackground, ManifestV3, WebAccessibleResourceByMatch } from './manifest'

export type ManifestV3Fn = (env: ConfigEnv) => ManifestV3 | Promise<ManifestV3>
export type ManifestV3Export = ManifestV3 | Promise<ManifestV3> | ManifestV3Fn

type Code = '.' | '/' | '\\'

export type ManifestFilePath<T extends string> =
  T extends `${Code}${string}`
    ? never
    : T extends `${string}.${infer Ext}`
      ? Ext extends ''
        ? never
        : T
      : never

export interface ManifestIcons<T extends string> {
  [size: number]: ManifestFilePath<T>
}

type FilePathFields<T extends string> = {
  icons?: ManifestIcons<T>

  action?: {
    /**
     * - Relative to Vite project root (where vite.config.js is)
     * - Format: "subdir/icon.png" (no leading ./ or /)
     * 
     * @example "assets/icon.png"
     */
    default_icon?: ManifestIcons<T>
    default_title?: string
    /**
     * - Relative to Vite project root (where vite.config.js is)
     * - Format: "subdir/index.html" (no leading ./ or /)
     * 
     * @example "src/popup.html"
     */
    default_popup?: ManifestFilePath<T>
  }

  background?:
    | {
        /**
         * - Relative to Vite project root (where vite.config.js is)
         * - Format: "subdir/index.js" (no leading ./ or /)
         * 
         * @example "src/background.js"
         */
        service_worker: ManifestFilePath<T>
        // eslint-disable-next-line @typescript-eslint/ban-types
        type?: 'module' | (string & {}) // If the service worker uses ES modules
      }
    | FirefoxManifestBackground

  content_scripts?: {
    matches?: string[]
    exclude_matches?: string[]
    /**
     * - Relative to Vite project root (where vite.config.js is)
     * - Format: "subdir/content.css" (no leading ./ or /)
     * 
     * @example "src/content.css"
     */
    css?: ManifestFilePath<T>[]
    /**
     * - Relative to Vite project root (where vite.config.js is)
     * - Format: "subdir/content.js" (no leading ./ or /)
     * 
     * @example "src/content.js"
     */
    js?: ManifestFilePath<T>[]
    run_at?: string
    all_frames?: boolean
    match_about_blank?: boolean
    include_globs?: string[]
    exclude_globs?: string[]
  }[]

  input_components?: {
    name: string
    id?: string
    language?: string | string[]
    layouts?: string | string[]
    input_view?: string
    /**
     * - Relative to Vite project root (where vite.config.js is)
     * - Format: "subdir/options.html" (no leading ./ or /)
     * 
     * @example "src/options.html"
     */
    options_page?: ManifestFilePath<T>
  }[]

  /**
   * - Relative to Vite project root (where vite.config.js is)
   * - Format: "subdir/options.html" (no leading ./ or /)
   * 
   * @example "src/options.html"
   */
  options_page?:  ManifestFilePath<T>
  /**
   * - Relative to Vite project root (where vite.config.js is)
   * - Format: "subdir/devtools.html" (no leading ./ or /)
   * 
   * @example "src/devtools.html"
   */
  devtools_page?: ManifestFilePath<T>
};

type ManifestOptions<T extends string> = Omit<ManifestV3, keyof FilePathFields<string>> & FilePathFields<T>

export type ManifestV3Options<T extends string = string> = ManifestOptions<T> | Promise<ManifestOptions<T>> | ManifestV3Define<T>

export type ManifestV3Define<T extends string> = (env: ConfigEnv) => ManifestOptions<T> | Promise<ManifestOptions<T>>

export const defineManifest = <T extends string>(manifest: ManifestV3Options<T>): ManifestV3Export =>
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
