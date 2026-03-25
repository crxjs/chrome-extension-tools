import contentDevLoader from 'client/iife/content-dev-loader.ts'
import contentDevShadowLoader from 'client/iife/content-dev-loader-shadow.ts'
import contentDevMainLoader from 'client/iife/content-dev-main-loader.ts'
import contentProLoader from 'client/iife/content-pro-loader.ts'
import contentProShadowLoader from 'client/iife/content-pro-loader-shadow.ts'
import contentProMainLoader from 'client/iife/content-pro-main-loader.ts'
import { filter } from 'rxjs'
import { hash } from './helpers'
import { RxMap } from './RxMap'

export interface ContentScript {
  type: 'module' | 'iife' | 'loader'
  /** Script entry file id */
  id: string
  /** Hash of scriptId or Rollup file refId */
  refId: string
  /** Resolved id for dynamic scripts */
  resolvedId?: string
  /** Script id for dynamic scripts */
  scriptId?: string
  /** Filename of loader file, if present */
  loaderName?: string
  /** Filename of content script */
  fileName?: string
  /** Content script from script import */
  isDynamicScript?: boolean
  /** Match patterns from manifest content scripts */
  matches: string[]
  /** CSS files imported by manifest */
  css?: string[]
  /** Whether this content script uses shadow DOM isolation */
  shadowDom?: boolean
  /** Shadow DOM mode ('open' or 'closed'), defaults to 'open' */
  shadowMode?: 'open' | 'closed'
}

/**
 * This RxMap supports a many-to-one relationship using multiple keys that have
 * very different formats:
 *
 * - Id: `/src/entry.ts`
 * - ScriptId: `/src/entry.ts?scriptId=abcde`
 * - RefId: `ab3ge`
 * - FileName: `src/entry.ts.js`
 * - LoaderName: `src/entry.ts-loader.js`
 *
 * When emitting to Rollup, strip the leading slash from FileName and LoaderName
 */
export const contentScripts = new RxMap<string, ContentScript>()
// sync subscriptions to change$ run before RxMap#set returns.
contentScripts.change$
  .pipe(filter(RxMap.isChangeType.set))
  .subscribe(({ map, value }) => {
    const keyNames = [
      'refId',
      'id',
      'fileName',
      'loaderName',
      'resolvedId',
      'scriptId',
    ] as const
    // set many to one value for lookup by multiple keys (script.id, script.fileName, etc)
    for (const keyName of keyNames) {
      const key = value[keyName]
      // avoid runaway recursion
      if (typeof key === 'undefined' || map.has(key)) {
        continue
      } else {
        map.set(key, value)
      }
    }
  })

/** Generates a hash of the script type and id */
export function hashScriptId(script: Pick<ContentScript, 'type' | 'id'>) {
  return hash(`${script.type}&${script.id}`)
}

export function createDevLoader({
  preamble,
  client,
  fileName,
}: {
  preamble: string
  client: string
  fileName: string
}): string {
  return contentDevLoader
    .replace(/__PREAMBLE__/g, JSON.stringify(preamble))
    .replace(/__CLIENT__/g, JSON.stringify(client))
    .replace(/__SCRIPT__/g, JSON.stringify(fileName))
    .replace(/__TIMESTAMP__/g, JSON.stringify(Date.now()))
}

export function createProLoader({ fileName }: { fileName: string }): string {
  return contentProLoader.replace(/__SCRIPT__/g, JSON.stringify(fileName))
}

export function createDevMainLoader({
  fileName,
}: {
  fileName: string
}): string {
  return contentDevMainLoader
    .replace(/__SCRIPT__/g, JSON.stringify(fileName))
    .replace(/__TIMESTAMP__/g, JSON.stringify(Date.now()))
}

export function createProMainLoader({
  fileName,
}: {
  fileName: string
}): string {
  return contentProMainLoader.replace(/__SCRIPT__/g, JSON.stringify(fileName))
}

export function createDevShadowLoader({
  preamble,
  client,
  fileName,
  shadowMode = 'open',
}: {
  preamble: string
  client: string
  fileName: string
  shadowMode?: string
}): string {
  return contentDevShadowLoader
    .replace(/__PREAMBLE__/g, JSON.stringify(preamble))
    .replace(/__CLIENT__/g, JSON.stringify(client))
    .replace(/__SCRIPT__/g, JSON.stringify(fileName))
    .replace(/__SHADOW_MODE__/g, JSON.stringify(shadowMode))
    .replace(/__TIMESTAMP__/g, JSON.stringify(Date.now()))
}

/**
 * Sentinel value used as a placeholder for CSS URLs in shadow loaders. Replaced
 * with actual CSS URLs during renderCrxManifest after CSS filenames are
 * resolved.
 */
export const SHADOW_CSS_PLACEHOLDER = '__CRX_SHADOW_CSS_URLS__'

export function createProShadowLoader({
  fileName,
  shadowMode = 'open',
}: {
  fileName: string
  shadowMode?: string
}): string {
  return contentProShadowLoader
    .replace(/__SCRIPT__/g, JSON.stringify(fileName))
    .replace(/__SHADOW_MODE__/g, JSON.stringify(shadowMode))
    .replace(/__CSS_URLS__/g, `[${JSON.stringify(SHADOW_CSS_PLACEHOLDER)}]`)
}
