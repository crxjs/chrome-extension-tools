import { simple } from 'acorn-walk'
import { createHash as _hash } from 'crypto'
import debug from 'debug'
import { AcornNode, OutputBundle, PluginContext } from 'rollup'
import type {
  ManifestV3,
  WebAccessibleResourceById,
  WebAccessibleResourceByMatch,
} from './manifest'
import type {
  AcornIdentifier,
  AcornLiteral,
  AcornMemberExpression,
  AcornTemplateElement,
} from './types'

export const _debug = (id: string) => debug('crx').extend(id)

export const hash = (data: string, length = 5): string =>
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

/** Is web accessible resource with match pattern array */
export const isResourceByMatch = (
  x: WebAccessibleResourceById | WebAccessibleResourceByMatch,
): x is WebAccessibleResourceByMatch => 'matches' in x

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
  let templateElement: AcornTemplateElement | undefined

  simple(tree, {
    Literal(node) {
      literal = node as AcornLiteral
    },
    TemplateElement(node) {
      templateElement = node as AcornTemplateElement
    },
  })

  let manifestJson: string | undefined = literal?.value
  if (!manifestJson) manifestJson = templateElement?.value?.cooked
  if (!manifestJson) throw new Error('unable to parse manifest code')

  let result: ManifestV3 = JSON.parse(manifestJson)
  if (typeof result === 'string') result = JSON.parse(result)
  return result
}

export function encodeManifest(manifest: ManifestV3): string {
  const json = JSON.stringify(JSON.stringify(manifest))
  return `export default ${json}`
}

export function parseJsonAsset<T>(bundle: OutputBundle, key: string): T {
  const asset = bundle[key]

  if (typeof asset === 'undefined')
    throw new TypeError(`OutputBundle["${key}"] is undefined.`)
  if (asset.type !== 'asset')
    throw new Error(`OutputBundle["${key}"] is not an OutputAsset.`)
  if (typeof asset.source !== 'string')
    throw new TypeError(`OutputBundle["${key}"].source is not a string.`)

  return JSON.parse(asset.source)
}

/**
 * [Strip paths for `web_accessible_resources`'s `matches` · Issue
 * #282](https://github.com/crxjs/chrome-extension-tools/issues/282)
 */
export const getMatchPatternOrigin = (pattern: string): string => {
  /**
   * Allow <all_urls> in matches section. [Issue
   * #459](https://github.com/crxjs/chrome-extension-tools/issues/459)
   */
  if (pattern.startsWith('<')) return pattern
  const [schema, rest] = pattern.split('://')
  const [origin, pathname] = rest.split('/')
  const root = `${schema}://${origin}`
  return pathname ? `${root}/*` : root
}
