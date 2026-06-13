import { build } from '../../runners'
import { testOutput } from '../../testOutput'
import { createSvelteAwareTest } from '../../svelteTestUtils'
import { test } from 'vitest'

test('build fs output', async () => {
  const result = await build(__dirname)
  // Use Svelte-aware test for compiled JS files to handle cross-platform differences
  const svelteTest = createSvelteAwareTest()
  const customTests = new Map([
    [/\.js$/, svelteTest],
  ])
  await testOutput(result, customTests)
})
