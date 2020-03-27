import glob from 'glob'
import get from 'lodash.get'
import diff from 'lodash.difference'
import { join } from 'path'
import { OutputChunk } from 'rollup'
import * as permissions from './permissions'
import {
  ChromeExtensionManifest,
  ContentScript,
} from '../../manifest'

/* ============================================ */
/*              DERIVE PERMISSIONS              */
/* ============================================ */

export const derivePermissions = (
  set: Set<string>,
  { code }: OutputChunk,
) =>
  Object.entries(permissions)
    .filter(([, fn]) => fn(code))
    .map(([key]) => key)
    .reduce((s, p) => s.add(p), set)

// /* ============================================ */
// /*                DERIVE MANIFEST               */
// /* ============================================ */

// export function deriveManifest(
//   manifest: ChromeExtensionManifest, // manifest.json
//   ...permissions: string[] | string[][] // will be combined with manifest.permissions
// ): ChromeExtensionManifest {
//   return validateManifest({
//     // SMELL: Is this necessary?
//     manifest_version: 2,
//     ...manifest,
//     permissions: combinePerms(permissions, manifest.permissions),
//   })
// }

/* -------------------------------------------- */
/*                 DERIVE FILES                 */
/* -------------------------------------------- */

export function deriveFiles(
  manifest: ChromeExtensionManifest,
  srcDir: string,
) {
  const files = get(
    manifest,
    'web_accessible_resources',
    [] as string[],
  ).reduce((r, x) => {
    if (glob.hasMagic(x)) {
      const files = glob.sync(x, { cwd: srcDir })
      return [...r, ...files.map((f) => f.replace(srcDir, ''))]
    } else {
      return [...r, x]
    }
  }, [] as string[])

  const js = [
    ...files.filter((f) => /\.[jt]sx?$/.test(f)),
    ...get(manifest, 'background.scripts', [] as string[]),
    ...get(
      manifest,
      'content_scripts',
      [] as ContentScript[],
    ).reduce((r, { js = [] }) => [...r, ...js], [] as string[]),
  ]

  const html = [
    ...files.filter((f) => /\.html?$/.test(f)),
    get(manifest, 'background.page'),
    get(manifest, 'options_page'),
    get(manifest, 'devtools_page'),
    get(manifest, 'browser_action.default_popup'),
    get(manifest, 'page_action.default_popup'),
    ...Object.values(get(manifest, 'chrome_url_overrides', {})),
  ]

  const css = [
    ...files.filter((f) => f.endsWith('.css')),
    ...get(
      manifest,
      'content_scripts',
      [] as ContentScript[],
    ).reduce(
      (r, { css = [] }) => [...r, ...css],
      [] as string[],
    ),
  ]

  // TODO: this can be a string or object
  const actionIconSet = [
    'browser_action.default_icon',
    'page_action.default_icon',
  ].reduce((set, query) => {
    const result: string | { [size: string]: string } = get(
      manifest,
      query,
      {},
    )

    if (typeof result === 'string') {
      set.add(result)
    } else {
      Object.values(result).forEach((x) => set.add(x))
    }

    return set
  }, new Set<string>())

  const img = [
    ...actionIconSet,
    ...files.filter((f) =>
      /\.(jpe?g|png|svg|tiff?|gif|webp|bmp|ico)$/i.test(f),
    ),
    ...Object.values(get(manifest, 'icons', {})),
  ]

  // Files like fonts, things that are not expected
  const others = diff(files, css, js, html, img)

  return {
    css: validate(css),
    js: validate(js),
    html: validate(html),
    img: validate(img),
    others: validate(others),
  }

  function validate(ary: any[]) {
    return [...new Set(ary.filter(isString))].map((x) =>
      join(srcDir, x),
    )
  }

  function isString(x: any): x is string {
    return typeof x === 'string'
  }
}
