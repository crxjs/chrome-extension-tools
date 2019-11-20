import 'array-flat-polyfill'

export const combinePerms = (...permissions: string[]) => {
  const { perms, xperms } = permissions
    .filter((x) => Array.isArray(x))
    .flat(Infinity)
    .reduce(
      ({ perms, xperms }, perm) => {
        if (perm.startsWith('!')) {
          xperms.add(perm.slice(1))
        } else {
          perms.add(perm)
        }

        return { perms, xperms }
      },
      { perms: new Set(), xperms: new Set() },
    )

  return [...perms].filter((p) => !xperms.has(p))
}
