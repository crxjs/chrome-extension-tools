import { Subject, Observable } from 'rxjs'

/** Decorated Map with Observable of change events. */
export class RxMap<K, V> extends Map<K, V> {
  change$: Observable<{
    type: keyof Map<string, unknown>
    key?: string
    map: RxMap<K, V>
  }>
  constructor(iterable?: Iterable<readonly [K, V]> | null | undefined) {
    super(iterable)

    const change$ = new Subject<{
      type: keyof Map<string, unknown>
      key?: string
      map: RxMap<K, V>
    }>()
    this.change$ = change$.asObservable()

    // Decorate change methods to emit change events
    const changeMethodKeys = ['clear', 'set', 'delete'] as const
    for (const type of changeMethodKeys) {
      const method = this[type]
      // @ts-expect-error too dynamic for ts to believe
      this[type] = function (this: typeof this, ...args) {
        // @ts-expect-error also too dynamic for ts
        const result = method.call(this, ...args)
        change$.next({ type, key: args[0], map: this })
        return result
      }.bind(this)
    }
  }
}
