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
      `${jsesc('background.js')}|${jsesc(hmrServiceWorkerName)}`,
    ),
    (source, name) => {
      expect(
        source.replace(
          /url\.port = JSON\.parse\("\d{4}"\);/,
          'url.port = JSON.parse("3000");',
        ),
      ).toMatchSnapshot(name)
    },
  )
  specialFiles.set(/\.html$/, (source, name) => {
    expect(
      source.replace(
        /http:\/\/localhost:\d{4}/g,
        'http://localhost:3000',
      ),
    ).toMatchSnapshot(name)
  })
  specialFiles.set('manifest.json', (source, name) => {
    const manifest = JSON.parse(
      source.replace(
        /http:\/\/localhost:\d{4}/g,
        'http://localhost:3000',
      ),
    )

    expect(manifest).toMatchSnapshot(name)
  })

  await testViteServe(shared, specialFiles)
})
