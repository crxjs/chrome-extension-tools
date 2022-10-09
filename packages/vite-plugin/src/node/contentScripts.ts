import { RxMap } from './RxMap'

export interface ContentScript {
  id: string
  refId?: string
  fileName?: string
  matches: string[]
}

export const contentScripts = new RxMap<string, ContentScript>()
