import { Subject, Observable } from 'rxjs'

export type RxMapChange<K, V> =
  | {
      type: 'clear'
      map: RxMap<K, V>
    }
  | {
      type: 'delete'
      key: K
      map: RxMap<K, V>
    }
  | {
      type: 'set'
      key: K
      value: V
      map: RxMap<K, V>
    }

/** Decorated Map with Observable of change events. */
export class RxMap<K, V> extends Map<K, V> {
  static isChangeType = {
    clear: <K, V>(
      x: RxMapChange<K, V>,
    ): x is Extract<typeof x, { type: 'clear' }> => x.type === 'clear',
    delete: <K, V>(
      x: RxMapChange<K, V>,
    ): x is Extract<typeof x, { type: 'delete' }> => x.type === 'delete',
    set: <K, V>(
      x: RxMapChange<K, V>,
    ): x is Extract<typeof x, { type: 'set' }> => x.type === 'set',
  }
  change$: Observable<RxMapChange<K, V>>
  constructor(iterable?: Iterable<readonly [K, V]> | null | undefined) {
    super(iterable)

    const change$ = new Subject<RxMapChange<K, V>>()
    this.change$ = change$.asObservable()

    // Decorate change methods to emit change events
    const changeMethodKeys = ['clear', 'set', 'delete'] as const
    for (const type of changeMethodKeys) {
      const method = this[type]
      // @ts-expect-error too dynamic for ts to believe
      this[type] = function (this: typeof this, ...args) {
        // @ts-expect-error also too dynamic for ts
        const result = method.call(this, ...args)
        change$.next({ type, key: args[0], value: args[1], map: this })
        return result
      }.bind(this)
    }
  }
}
