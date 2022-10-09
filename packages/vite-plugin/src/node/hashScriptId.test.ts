import { hashScriptId } from './contentScripts'
import { test, expect } from 'vitest'

test('hashScriptId returns a stable hash', async () => {
  const hashes = new Set<string>()
  for (let count = 0; count < 5; count++) {
    hashes.add(hashScriptId({ type: 'module', id: 'abc123' }))
  }
  expect(hashes.size).toBe(1)
})
