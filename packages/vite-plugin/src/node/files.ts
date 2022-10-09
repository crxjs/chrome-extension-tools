import fg from 'fast-glob'
import { ManifestV3 } from './manifest'
import { ManifestFiles } from './types'
import { isString } from './helpers'

export async function manifestFiles(
  manifest: ManifestV3,
  options: fg.Options = {},
): Promise<ManifestFiles> {
  // JSON
  let locales: string[] = []
  if (manifest.default_locale)
    locales = await fg('_locales/**/messages.json', options)

  const rulesets =
    manifest.declarative_net_request?.rule_resources.flatMap(
      ({ path }) => path,
    ) ?? []

  const contentScripts = manifest.content_scripts?.flatMap(({ js }) => js) ?? []
  const contentStyles = manifest.content_scripts?.flatMap(({ css }) => css)
  const serviceWorker = manifest.background?.service_worker
  const htmlPages = htmlFiles(manifest)

  const icons = [
    Object.values(
      isString(manifest.icons) ? [manifest.icons] : manifest.icons ?? {},
    ) as string[],
    Object.values(
      isString(manifest.action?.default_icon)
        ? [manifest.action?.default_icon]
        : manifest.action?.default_icon ?? {},
    ) as string[],
  ].flat()

  let webAccessibleResources: string[] = []
  if (manifest.web_accessible_resources) {
    const resources = await Promise.all(
      manifest.web_accessible_resources
        .flatMap(({ resources }) => resources!)
        .map(async (r) => {
          // don't copy node_modules, etc
          if (['*', '**/*'].includes(r)) return undefined
          if (fg.isDynamicPattern(r)) return fg(r, options)
          return r
        }),
    )
    webAccessibleResources = resources.flat().filter(isString)
  }

  return {
    contentScripts: [...new Set(contentScripts)].filter(isString),
    contentStyles: [...new Set(contentStyles)].filter(isString),
    html: htmlPages,
    icons: [...new Set(icons)].filter(isString),
    locales: [...new Set(locales)].filter(isString),
    rulesets: [...new Set(rulesets)].filter(isString),
    background: [serviceWorker].filter(isString),
    webAccessibleResources,
  }
}

export async function dirFiles(dir: string): Promise<string[]> {
  const files = await fg(`${dir}/**/*`)
  return files
}

export function htmlFiles(manifest: ManifestV3): string[] {
  const files = [
    manifest.action?.default_popup,
    Object.values(manifest.chrome_url_overrides ?? {}),
    manifest.devtools_page,
    manifest.options_page,
    manifest.options_ui?.page,
    manifest.sandbox?.pages,
  ]
    .flat()
    .filter(isString)
    .map((s) => s.split('#')[0])
    .sort()
  return [...new Set(files)]
}
