import { serve } from '../../runners'
import { testOutput } from '../../testOutput'
import { createSvelteAwareTest } from '../../svelteTestUtils'
import { test } from 'vitest'

test('serve fs output', async () => {
  const result = await serve(__dirname)
  // Use Svelte-aware test for .svelte.js files to handle cross-platform differences
  const svelteTest = createSvelteAwareTest()
  const customTests = new Map([
    [/\.svelte\.js$/, svelteTest],
  ])
  await testOutput(result, customTests)
})
