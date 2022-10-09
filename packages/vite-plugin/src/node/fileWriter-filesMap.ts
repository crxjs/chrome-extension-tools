import type { write } from './fileWriter'
import { RxMap } from './RxMap'
import { CrxDevAssetId, CrxDevScriptId } from './types'

export interface ScriptFile {
  id: string
  type: CrxDevAssetId['type'] | CrxDevScriptId['type']
  fileName: string
  file: ReturnType<typeof write>
}

export const scriptFiles = new RxMap<string, ScriptFile>()
