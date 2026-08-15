import { readFileSync } from 'fs'
import { createRequire } from 'module'
import { expect, test } from 'vitest'
import { patchCustomElementsPolyfill } from './plugin-fileWriter-polyfill'
import { customElementsId } from './virtualFileIds'

const _require =
  typeof require === 'undefined' ? createRequire(import.meta.url) : require
const unguardedOwnerDocumentAccess = /(^|[^&])this\.ownerDocument\.__CE_registry/

test('guards custom elements ownerDocument registry accesses', () => {
  const code = [
    'this.ownerDocument.__CE_registry?V(a,this):Q(a,this)',
    'this.ownerDocument.__CE_registry?V(a,d):Q(a,d)',
  ].join(';')

  const result = patchCustomElementsPolyfill(code)

  expect(result).not.toMatch(unguardedOwnerDocumentAccess)
  expect(result).toContain(
    'this.ownerDocument&&this.ownerDocument.__CE_registry?V(a,this):Q(a,this)',
  )
  expect(result).toContain(
    'this.ownerDocument&&this.ownerDocument.__CE_registry?V(a,d):Q(a,d)',
  )
})

test('patches the bundled custom elements polyfill', () => {
  const customElementsPath = _require.resolve(customElementsId.slice(1))
  const code = readFileSync(customElementsPath, 'utf8')

  expect(patchCustomElementsPolyfill(code)).not.toMatch(
    unguardedOwnerDocumentAccess,
  )
})
