import manifestTiny from './sample_manifests/manifest-1.json'
import { flattenObject } from '../../../src/manifest-input/manifest-parser/flat'

test('gets all primitive values', () => {
  const result = flattenObject(manifestTiny)

  expect(result).toBeInstanceOf(Array)
  //author is a key and should be flattened!
  expect(result).not.toContain('author')
  expect(result).toContain('background.js')
  expect(result).toContain(false)
})
