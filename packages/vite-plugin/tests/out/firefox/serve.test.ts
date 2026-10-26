import { getCrxHmrToken } from 'src/hmrToken'
import { serve } from 'tests/runners'
import { testOutput } from 'tests/testOutput'
import { expect, test } from 'vitest'

test('Firefox development output: CSP, static background imports and local HTML assets', async () => {
  const result = await serve(__dirname)
  const token = getCrxHmrToken(result.config)
  await testOutput(
    result,
    new Map([
      [
        'main.js-loader.js',
        (source, name) => {
          // Keep the bridge snapshot stable without hiding its message channels.
          expect(source.replaceAll(token, '<hmr-token>')).toMatchSnapshot(name)
        },
      ],
    ]),
  )
})
