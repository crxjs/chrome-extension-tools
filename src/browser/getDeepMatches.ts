/**
 * Get matches from an object of nested objects
 *
 * @export
 * @template T Type of matches
 * @param {*} object Parent object to search
 * @param {(x: any) => boolean} pred A predicate function that will receive each property value of an object
 * @param {string[]} excludeKeys Exclude a property if the key exactly matches
 * @returns {T[]} The matched values from the parent object
 */
export function getDeepMatches<T>(
  object: any,
  pred: (x: any) => boolean,
  excludeKeys: string[],
): T[] {
  const keys =
    typeof object === 'object' && object
      ? Object.keys(object)
      : []

  return keys.length
    ? keys
        .filter((key) => !excludeKeys.includes(key))
        .reduce((r, key) => {
          const target = object[key]

          if (target && pred(target)) {
            return [...r, target]
          } else {
            return [
              ...r,
              ...getDeepMatches(target, pred, excludeKeys),
            ]
          }
        }, [] as T[])
    : []
}
