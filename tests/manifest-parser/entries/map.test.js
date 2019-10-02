import { mapObjectFields } from '../../../src/manifest-input/manifest-parser/map'

const obj1 = {
  a: 1,
  b: 'b',
  c: ['c'],
  d: { e: 'e' },
}

const obj2 = {
  a: 1,
  b: 'replaced',
  c: ['replaced'],
  d: { e: 'replaced' },
}

const mapFn = value => {
  if (typeof value === 'string') {
    return 'replaced'
  }

  return value
}

test('replace strings in object', () => {
  const result = mapObjectFields(obj1, mapFn)

  expect(result).toEqual(obj2)
})
