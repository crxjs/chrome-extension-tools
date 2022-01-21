import {
  testViteServe,
  setupViteServe,
  SpecialFilesMap,
} from '$test/helpers/testServe'
import { jestSetTimeout } from '$test/helpers/timeout'

jestSetTimeout(30000)

const shared = setupViteServe({ __dirname })

test('manifest vs output', async () => {
  const specialFiles: SpecialFilesMap = new Map()
  specialFiles.set('background.js', (filename, source) => {
    expect(
      source.replace(
        `url.port = JSON.parse("${
          shared.devServer!.config.server.port
        }");`,
        'url.port = JSON.parse("3000");',
      ),
    ).toMatchSnapshot(filename)
  })

  await testViteServe(shared, specialFiles)
})
