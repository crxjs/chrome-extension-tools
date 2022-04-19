import 'array-flat-polyfill'

export const combinePerms = (
  ...permissions: string[] | string[][]
): string[] => {
  const { perms, xperms } = (permissions.flat(
    Infinity,
  ) as string[])
    .filter((perm) => typeof perm !== 'undefined')
    .reduce(
      ({ perms, xperms }, perm) => {
        if (perm.startsWith('!')) {
          xperms.add(perm.slice(1))
        } else {
          perms.add(perm)
        }

        return { perms, xperms }
      },
      { perms: new Set<string>(), xperms: new Set<string>() },
    )

  return [...perms].filter((p) => !xperms.has(p))
}
