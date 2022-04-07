import { simple } from 'acorn-walk'
import { createHash as _hash } from 'crypto'
import debug from 'debug'
import fg from 'fast-glob'
import { AcornNode, PluginContext } from 'rollup'
import v8 from 'v8'
import type {
  ManifestV3,
  WebAccessibleResourceById,
  WebAccessibleResourceByMatch,
} from './manifest'
import type {
  AcornIdentifier,
  AcornLiteral,
  AcornMemberExpression,
  ManifestFiles,
} from './types'

export const _debug = (id: string) => debug('crx').extend(id)

export const structuredClone = <T>(obj: T): T => {
  return v8.deserialize(v8.serialize(obj))
}

export const createHash = (data: string, length = 5): string =>
  _hash('sha1')
    .update(data)
    .digest('base64')
    .replace(/[^A-Za-z0-9]/g, '')
    .slice(0, length)

export const isString = (x: unknown): x is string => typeof x === 'string'

type Falsy = false | 0 | '' | null | undefined
export const isTruthy = <T>(x: T | Falsy): x is T => !!x

export const isPresent = <T>(x: T | null | undefined): x is T =>
  x !== null && typeof x !== 'undefined'

export function isObject<T>(
  value: T,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): value is Extract<T, Record<string, any>> {
  return Object.prototype.toString.call(value) === '[object Object]'
}

export const isResourceByMatch = (
  x: WebAccessibleResourceById | WebAccessibleResourceByMatch,
): x is WebAccessibleResourceByMatch => 'matches' in x

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
    Object.values(manifest.icons ?? {}) as string[],
    Object.values(manifest.action?.default_icon ?? {}) as string[],
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

export function isMemberExpression(n: AcornNode): n is AcornMemberExpression {
  return n.type === 'MemberExpression'
}

export function isLiteral(n: AcornNode): n is AcornLiteral {
  return n.type === 'Literal'
}

export function isIdentifier(n: AcornNode): n is AcornIdentifier {
  return n.type === 'Identifier'
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
