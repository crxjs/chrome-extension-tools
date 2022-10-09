import { Subject, Observable } from 'rxjs'
import type { write } from './fileWriter'
import { CrxDevAssetId, CrxDevScriptId } from './types'

export interface ScriptFile {
  id: string
  type: CrxDevAssetId['type'] | CrxDevScriptId['type']
  fileName: string
  file: ReturnType<typeof write>
}

export interface ScriptFileChange {
  type: keyof Map<string, ScriptFile>
  key?: string
}

/** Decorated Map of ScriptFiles with Observable of change events. */
class ScriptFilesMap extends Map<string, ScriptFile> {
  change$: Observable<ScriptFileChange>
  constructor(
    iterable?: Iterable<readonly [string, ScriptFile]> | null | undefined,
  ) {
    super(iterable)

    const change$ = new Subject<ScriptFileChange>()
    this.change$ = change$.asObservable()

    // Decorate change methods to emit change events
    const changeMethodKeys = ['clear', 'set', 'delete'] as const
    for (const type of changeMethodKeys) {
      const method = this[type]
      // @ts-expect-error too dynamic for ts to believe
      this[type] = function (...args) {
        // @ts-expect-error also too dynamic for ts
        const result = method.call(this, ...args)
        change$.next({ type, key: args[0] })
        return result
      }.bind(this)
    }
  }
}

export const scriptFiles = new ScriptFilesMap()
