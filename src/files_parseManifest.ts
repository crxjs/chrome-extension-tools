import { get } from 'lodash'
import { isString } from './helpers'
import {
  AssetType,
  ContentScript,
  DeclarativeNetRequestResource,
  Manifest,
  ScriptType,
} from './types'

function dedupe(ary: any[]) {
  return [...new Set(ary.filter(isString))]
}

/**
 * Returns filenames and match patterns relative
 * to the manifest, which must be in the root folder.
 */
export function parseManifest(
  manifest: Manifest,
): Record<
  | Exclude<ScriptType, 'MODULE'>
  | Exclude<AssetType, 'MANIFEST' | 'RAW'>,
  string[]
> {
  if (manifest.manifest_version === 3) {
    return deriveFilesMV3(manifest)
  } else {
    return deriveFilesMV2(manifest)
  }
}

export function deriveFilesMV3(
  manifest: chrome.runtime.ManifestV3,
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

  const json = locales.concat(rulesets.map(({ path }) => path))

  const contentScripts = get(
    manifest,
    'content_scripts',
    [] as ContentScript[],
  ).reduce((r, { js = [] }) => [...r, ...js], [] as string[])

  const background: string[] = [
    get(manifest, 'background.service_worker'),
  ]

  const html = [
    get(manifest, 'options_page'),
    get(manifest, 'options_ui.page'),
    get(manifest, 'devtools_page'),
    get(manifest, 'action.default_popup'),
    ...Object.values(get(manifest, 'chrome_url_overrides', {})),
  ]

  const css = get(
    manifest,
    'content_scripts',
    [] as ContentScript[],
  ).reduce((r, { css = [] }) => [...r, ...css], [] as string[])

  const img = [
    ...(Object.values(get(manifest, 'icons', {})) as string[]),
    ...(Object.values(
      get(manifest, 'action.default_icon', {}),
    ) as string[]),
  ]

  return {
    BACKGROUND: dedupe(background),
    CONTENT: dedupe(contentScripts),
    CSS: dedupe(css),
    HTML: dedupe(html),
    IMAGE: dedupe(img),
    JSON: dedupe(json),
  }
}

export function deriveFilesMV2(
  manifest: chrome.runtime.ManifestV2,
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

  const json = locales.concat(rulesets.map(({ path }) => path))

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

  const html = [
    get(manifest, 'background.page'),
    get(manifest, 'options_page'),
    get(manifest, 'options_ui.page'),
    get(manifest, 'devtools_page'),
    get(manifest, 'browser_action.default_popup'),
    get(manifest, 'page_action.default_popup'),
    ...Object.values(get(manifest, 'chrome_url_overrides', {})),
  ]

  const css = [
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
    ...Object.values(get(manifest, 'icons', {})),
  ]

  return {
    BACKGROUND: dedupe(background),
    CONTENT: dedupe(contentScripts),
    CSS: dedupe(css),
    HTML: dedupe(html),
    IMAGE: dedupe(img),
    JSON: dedupe(json),
  }
}
