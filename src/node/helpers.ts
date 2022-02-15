import { simple } from 'acorn-walk'
import _debug from 'debug'
import fg from 'fast-glob'
import { PluginContext } from 'rollup'
import v8 from 'v8'
import type {
  ManifestV3,
  WebAccessibleResourceById,
  WebAccessibleResourceByMatch,
} from './manifest'
import type { AcornLiteral } from './types'

export const structuredClone = <T>(obj: T): T => {
  return v8.deserialize(v8.serialize(obj))
}

export { _debug } // makes it easy to import w/ intellisense

export const isString = (x: unknown): x is string => typeof x === 'string'

export const isPresent = <T>(x: T): x is NonNullable<T> => !!x

export function isObject<T>(
  value: T,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): value is Extract<T, Record<string, any>> {
  return Object.prototype.toString.call(value) === '[object Object]'
}

export const isResourceByMatch = (
  x: WebAccessibleResourceById | WebAccessibleResourceByMatch,
): x is WebAccessibleResourceByMatch => 'matches' in x

export async function allFiles(manifest: ManifestV3, options: fg.Options) {
  // JSON
  let locales: string[] = []
  if (manifest.default_locale)
    locales = await fg('_locales/**/messages.json', options)

  const rulesets =
    manifest.declarative_net_request?.rule_resources.flatMap(
      ({ path }) => path,
    ) ?? []

  const js = manifest.content_scripts?.flatMap(({ js }) => js) ?? []
  const serviceWorker = manifest.background?.service_worker
  const css = manifest.content_scripts?.flatMap(({ css }) => css)
  const htmlPages = htmlFiles(manifest)

  const icons = [
    Object.values(manifest.icons ?? {}) as string[],
    Object.values(manifest.action?.default_icon ?? {}) as string[],
  ].flat()

  return {
    js: [...new Set(js)].filter(isString),
    css: [...new Set(css)].filter(isString),
    htmlPages: htmlPages,
    icons: [...new Set(icons)].filter(isString),
    locales: [...new Set(locales)].filter(isString),
    rulesets: [...new Set(rulesets)].filter(isString),
    serviceWorker: [serviceWorker].filter(isString),
  }
}

export function htmlFiles(manifest: ManifestV3): string[] {
  const files = [
    manifest.action?.default_popup,
    Object.values(manifest.chrome_settings_overrides ?? {}),
    manifest.devtools_page,
    manifest.options_page,
    manifest.options_ui?.page,
  ]
    .flat()
    .filter(isString)
    .sort()
  return [...new Set(files)]
}

export function decodeManifest(this: PluginContext, code: string): ManifestV3 {
  const tree = this.parse(code)
  let literal: AcornLiteral | undefined
  simple(tree, {
    Literal(n) {
      literal = n as AcornLiteral
    },
  })
  if (!literal) throw new Error('unable to parse manifest code')
  let result: ManifestV3 = JSON.parse(literal.value)
  if (typeof result === 'string') result = JSON.parse(result)
  return result
}

export function encodeManifest(manifest: ManifestV3): string {
  const json = JSON.stringify(JSON.stringify(manifest))
  return `export default ${json}`
}
