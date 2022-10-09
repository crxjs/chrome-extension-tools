import type { write } from './fileWriter'
import { RxMap } from './RxMap'
import { CrxDevAssetId, CrxDevScriptId } from './types'

export interface OutputFile {
  id: string
  type: CrxDevAssetId['type'] | CrxDevScriptId['type']
  fileName: string
  file: ReturnType<typeof write>
}

/** OutputFiles by OutputFile#filename */
export const outputFiles = new RxMap<string, OutputFile>()
