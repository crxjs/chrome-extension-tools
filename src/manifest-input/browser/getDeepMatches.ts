export function getDeepMatches<T>(object: any, pred: (x: any) => boolean): T[] {
  const keys = typeof object === 'object' ? Object.keys(object) : []

  return keys.length
    ? keys.reduce((r, key) => {
        const target = object[key]

        if (target && pred(target)) {
          return [...r, target]
        } else {
          return [...r, ...getDeepMatches(target, pred)]
        }
      }, [] as T[])
    : []
}