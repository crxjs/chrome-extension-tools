import { mapObjectValues } from '../../src/manifest-input/mapObjectValues'

const mapFn = (value) => {
  if (typeof value === 'string') {
    return 'replaced'
  }

  return value
}

test('replace strings in object', () => {
  const obj1 = {
    a: 1,
    b: 'b',
    c: ['c'],
    d: { e: 'e' },
    e: [{ f: ['f'] }],
    f: [[[['g']]]],
  }

  const obj2 = {
    a: 1,
    b: 'replaced',
    c: ['replaced'],
    d: { e: 'replaced' },
    e: [{ f: ['replaced'] }],
    f: [[[['replaced']]]],
  }

  const result = mapObjectValues(obj1, mapFn)

  expect(result).toEqual(obj2)
  expect(result).not.toBe(obj1)
})

test('replace strings in array', () => {
  const a = [{ f: ['f'] }]

  const b = [{ f: ['replaced'] }]

  const result = mapObjectValues(a, mapFn)

  expect(result).toEqual(b)
  expect(result).not.toBe(a)
})

test('replace strings in nested array', () => {
  const a = [[[['g']]]]

  const b = [[[['replaced']]]]

  const result = mapObjectValues(a, mapFn)

  expect(result).toEqual(b)
  expect(result).not.toBe(a)
})
