import glob from 'glob'
import { difference as diff, get } from 'lodash'
import { join } from 'path'
import { isString } from '../helpers'
import {
  ContentScript,
  DeclarativeNetRequestResource,
} from '../manifest-types'

export function parseManifest(
  manifest: chrome.runtime.Manifest,
  srcDir: string,
): {
  css: string[]
  contentScripts: string[]
  background: string[]
  js: string[]
  html: string[]
  img: string[]
  others: string[]
} {
  if (manifest.manifest_version === 3) {
    return deriveFilesMV3(manifest, srcDir)
  } else {
    return deriveFilesMV2(manifest, srcDir)
  }
}

export function deriveFilesMV3(
  manifest: chrome.runtime.ManifestV3,
  srcDir: string,
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

  const files = get(
    manifest,
    'web_accessible_resources',
    [] as Required<typeof manifest>['web_accessible_resources'],
  )
    .flatMap(({ resources }) => resources)
    .concat(locales)
    .reduce((r, x) => {
      if (glob.hasMagic(x)) {
        const files = glob.sync(x, { cwd: srcDir })
        return [...r, ...files.map((f) => f.replace(srcDir, ''))]
      } else {
        return [...r, x]
      }
    }, [] as string[])
    .concat(rulesets.map(({ path }) => path))

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
    background: validate(background),
    contentScripts: validate(contentScripts),
    css: validate(css),
    html: validate(html),
    img: validate(img),
    js: validate(js),
    others: validate(others),
  }

  function validate(ary: any[]) {
    return [...new Set(ary.filter(isString))].map((x) =>
      join(srcDir, x),
    )
  }
}

export function deriveFilesMV2(
  manifest: chrome.runtime.ManifestV2,
  srcDir: string,
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

  const files = get(
    manifest,
    'web_accessible_resources',
    [] as Required<typeof manifest>['web_accessible_resources'],
  )
    .concat(locales)
    .reduce((r, x) => {
      if (glob.hasMagic(x)) {
        const files = glob.sync(x, { cwd: srcDir })
        return [...r, ...files.map((f) => f.replace(srcDir, ''))]
      } else {
        return [...r, x]
      }
    }, [] as string[])
    .concat(rulesets.map(({ path }) => path))

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
    background: validate(background),
    contentScripts: validate(contentScripts),
    css: validate(css),
    html: validate(html),
    img: validate(img),
    js: validate(js),
    others: validate(others),
  }

  function validate(ary: any[]) {
    return [...new Set(ary.filter(isString))].map((x) =>
      join(srcDir, x),
    )
  }
}
