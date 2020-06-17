export function getDeepKeyMatches<T>(object: any, pred: (x: any) => boolean): T[] {
  const keys = typeof object === 'object' ? Object.keys(object) : []

  return keys.length
    ? keys.reduce((r, key) => {
        const target = object[key]

        if (target && pred(target)) {
          return [...r, target]
        } else {
          return [...r, ...getDeepKeyMatches(target, pred)]
        }
      }, [] as T[])
    : []
}