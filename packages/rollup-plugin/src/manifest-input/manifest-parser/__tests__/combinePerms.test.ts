import { combinePerms } from '../combine'

test('returns all permissions', () => {
  const perms1 = ['a', 'b', 'c']
  const perms2 = ['d', 'e', 'f']

  const result = combinePerms(...perms1, ...perms2)

  expect(result).toContain('a')
  expect(result).toContain('b')
  expect(result).toContain('c')
  expect(result).toContain('d')
  expect(result).toContain('e')
  expect(result).toContain('f')
})


test('excludes ! permissions', () => {
  const perms1 = ['a', 'b', '!c']
  const perms2 = ['!d', 'e', 'f']

  const result = combinePerms(...perms1, ...perms2)
 
  expect(result).toContain('a')
  expect(result).toContain('b')
  expect(result).not.toContain('c')
  expect(result).not.toContain('d')
  expect(result).toContain('e')
  expect(result).toContain('f')
})


test('does not emit duplicates', () => {
  const perms1 = ['a', 'b', 'd']
  const perms2 = ['d', 'd', 'f']

  const result = combinePerms(...perms1, ...perms2)
 
  expect(result.length).toBe(4)
  expect(result).toContain('a')
  expect(result).toContain('b')
  expect(result).toContain('d')
  expect(result).toContain('f')
})

