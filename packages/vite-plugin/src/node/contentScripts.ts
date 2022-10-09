import contentDevLoader from 'client/iife/content-dev-loader.ts?client'
import contentProLoader from 'client/iife/content-pro-loader.ts?client'
import { filter } from 'rxjs'
import { hash } from './helpers'
import { isChangeType, RxMap } from './RxMap'

export interface ContentScript {
  type: 'module' | 'iife' | 'loader'
  /** Script entry file id */
  id: string
  /** Hash of scriptId or Rollup file refId */
  refId?: string
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
}

/**
 * This RxMap uses multiple keys that have very different formats:
 *
 * - Id: `/src/entry.ts`
 * - ScriptId: `/src/entry.ts?scriptId=abcde`
 * - RefId: `ab3ge`
 */
export const contentScripts = new RxMap<string, ContentScript>()
// sync subscriptions to change$ run before RxMap#set returns.
contentScripts.change$
  .pipe(filter(isChangeType.set))
  .subscribe(({ map, value }) => {
    if (typeof value.refId === 'string')
      if (typeof map.get(value.refId) === 'undefined') {
        map.set(value.refId, value)
      }

    if (typeof map.get(value.id) === 'undefined') {
      map.set(value.id, value)
    }

    if (typeof value.fileName === 'string')
      if (typeof map.get(value.fileName) === 'undefined') {
        map.set(value.fileName, value)
      }
    if (typeof value.loaderName === 'string')
      if (typeof map.get(value.loaderName) === 'undefined') {
        map.set(value.loaderName, value)
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
