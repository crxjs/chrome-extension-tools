import { hmrServiceWorkerName } from '$src/plugin-viteServeHMR_MV3'
import {
  testViteServe,
  setupViteServe,
  SpecialFilesMap,
} from '$test/helpers/testServe'
import { jestSetTimeout } from '$test/helpers/timeout'
import jsesc from 'jsesc'

jestSetTimeout(30000)

const shared = setupViteServe({ dirname: __dirname })

test('manifest vs output', async () => {
  const specialFiles: SpecialFilesMap = new Map()
  specialFiles.set(
    new RegExp(
      `${jsesc('background')}|${jsesc(hmrServiceWorkerName)}`,
    ),
    (source, name) => {
      const port = shared.devServer!.config.server.port!
      expect(
        source.replace(
          `url.port = JSON.parse("${port}");`,
          'url.port = JSON.parse("3000");',
        ),
      ).toMatchSnapshot(name)
    },
  )
  specialFiles.set(/\.html$/, (source, name) => {
    const port = shared.devServer!.config.server.port!
    expect(typeof port).toBe('number')
    expect(
      source.replace(
        new RegExp(jsesc(`http://localhost:${port}`), 'g'),
        'http://localhost:3000',
      ),
    ).toMatchSnapshot(name)
  })
  specialFiles.set('manifest.json', (source, name, matcher) => {
    const manifest = JSON.parse(source)
    expect(manifest).toMatchSnapshot(
      {
        ...matcher,
        content_security_policy: expect.stringMatching(
          /script-src 'self' http:\/\/localhost:\d{4} 'sha256-.+?'; object-src 'self'/,
        ),
      },
      name,
    )
  })

  await testViteServe(shared, specialFiles)
})
