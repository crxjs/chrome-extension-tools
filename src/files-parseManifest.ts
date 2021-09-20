import glob from 'glob'
import { difference as diff, get } from 'lodash'
import { isString } from './helpers'
import {
  AssetType,
  ContentScript,
  DeclarativeNetRequestResource,
  Manifest,
  ScriptType,
} from './types'

export function parseManifest(
  manifest: Manifest,
  root: string,
): Record<
  ScriptType | Exclude<AssetType, 'MANIFEST'>,
  string[]
> {
  if (manifest.manifest_version === 3) {
    return deriveFilesMV3(manifest, root)
  } else {
    return deriveFilesMV2(manifest, root)
  }
}

export function deriveFilesMV3(
  manifest: chrome.runtime.ManifestV3,
  root: string,
) {
  const locales = isString(manifest.default_locale)
    ? ['_locales/**/messages.json']
    : []

  // TODO: add tests for declarativeNetRequest
  const rulesets: DeclarativeNetRequestResource[] = get(
    manifest,
    'declarative_net_request.rule_resources',
    [] as DeclarativeNetRequestResource[],
  )

  const json = locales
    .reduce(expandPatterns(root), [] as string[])
    .concat(rulesets.map(({ path }) => path))

  const files = get(
    manifest,
    'web_accessible_resources',
    [] as Required<typeof manifest>['web_accessible_resources'],
  )
    .flatMap(({ resources }) => resources)
    .reduce(expandPatterns(root), [] as string[])

  const contentScripts = get(
    manifest,
    'content_scripts',
    [] as ContentScript[],
  ).reduce((r, { js = [] }) => [...r, ...js], [] as string[])

  const background: string[] = [
    get(manifest, 'background.service_worker'),
  ]

  const js = files.filter((f) => /\.[jt]sx?$/.test(f))

  const html = [
    ...files.filter((f) => /\.html?$/.test(f)),
    get(manifest, 'options_page'),
    get(manifest, 'options_ui.page'),
    get(manifest, 'devtools_page'),
    get(manifest, 'action.default_popup'),
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

  const img = [
    ...files.filter((f) =>
      /\.(jpe?g|png|svg|tiff?|gif|webp|bmp|ico)$/i.test(f),
    ),
    ...(Object.values(get(manifest, 'icons', {})) as string[]),
    ...(Object.values(
      get(manifest, 'action.default_icon', {}),
    ) as string[]),
  ]

  // Files like fonts, things that are not expected
  const others = diff(files, css, js, html, img)

  return {
    BACKGROUND: dedupe(background),
    CONTENT: dedupe(contentScripts),
    SCRIPT: dedupe(js),
    CSS: dedupe(css),
    HTML: dedupe(html),
    IMAGE: dedupe(img),
    RAW: dedupe(others),
    JSON: dedupe(json),
  }
}

export function deriveFilesMV2(
  manifest: chrome.runtime.ManifestV2,
  root: string,
) {
  const locales = isString(manifest.default_locale)
    ? ['_locales/**/messages.json']
    : []

  // TODO: add tests for declarativeNetRequest
  const rulesets: DeclarativeNetRequestResource[] = get(
    manifest,
    'declarative_net_request.rule_resources',
    [] as DeclarativeNetRequestResource[],
  )

  const json = locales
    .reduce(expandPatterns(root), [] as string[])
    .concat(rulesets.map(({ path }) => path))

  const files = get(
    manifest,
    'web_accessible_resources',
    [] as Required<typeof manifest>['web_accessible_resources'],
  ).reduce(expandPatterns(root), [] as string[])

  const contentScripts = get(
    manifest,
    'content_scripts',
    [] as ContentScript[],
  ).reduce((r, { js = [] }) => [...r, ...js], [] as string[])

  const background = get(
    manifest,
    'background.scripts',
    [] as string[],
  )

  const js = files.filter((f) => /\.[jt]sx?$/.test(f))

  const html = [
    ...files.filter((f) => /\.html?$/.test(f)),
    get(manifest, 'background.page'),
    get(manifest, 'options_page'),
    get(manifest, 'options_ui.page'),
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
  const others = diff(files, css, contentScripts, js, html, img)

  return {
    BACKGROUND: dedupe(background),
    CONTENT: dedupe(contentScripts),
    SCRIPT: dedupe(js),
    CSS: dedupe(css),
    HTML: dedupe(html),
    IMAGE: dedupe(img),
    RAW: dedupe(others),
    JSON: dedupe(json),
  }
}

function dedupe(ary: any[]) {
  return [...new Set(ary.filter(isString))]
}

function expandPatterns(
  root: string,
): (
  previousValue: string[],
  currentValue: string,
  currentIndex: number,
  array: string[],
) => string[] {
  return (r, x) => {
    if (glob.hasMagic(x)) {
      const files = glob.sync(x, { cwd: root })
      return [...r, ...files.map((f) => f.replace(root, ''))]
    } else {
      return [...r, x]
    }
  }
}
