import { RxMap } from './RxMap'

export interface ContentScript {
  type: 'module' | 'iife'
  id: string
  refId?: string
  fileName?: string
  matches: string[]
}

export const contentScripts = new RxMap<string, ContentScript>()
