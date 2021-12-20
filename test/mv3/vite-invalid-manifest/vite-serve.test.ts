import {
  filesReady,
  stopFileWriter,
} from '$src/plugin-viteServeFileWriter'
import { errorSpy } from '$test/helpers/consoleSpies'
import { jestSetTimeout } from '$test/helpers/timeout'
import fs from 'fs-extra'
import path from 'path'
import { createServer, ViteDevServer } from 'vite'

errorSpy.mockImplementation()

jestSetTimeout(5000)

const outDir = path.join(__dirname, 'dist-serve')

let devServer: ViteDevServer
beforeAll(async () => {
  await fs.remove(outDir)

  devServer = await createServer({
    configFile: path.join(__dirname, 'vite.config.ts'),
    envFile: false,
    build: { outDir },
  })
})

afterAll(async () => {
  stopFileWriter()
  await devServer.close()
})

test('validation errors rise', async () => {
  expect(fs.existsSync(outDir)).toBe(false)

  await expect(
    Promise.all([devServer.listen(), filesReady()]),
  ).rejects.toThrow()

  // We can safely ignore this, it happens when a service is stopped
  // https://github.com/statelyai/xstate/issues/1792
  // expect(warnSpy).toBeCalledWith(
  //   "Warning: No implementation found for action type 'xstate.assign'",
  // )

  expect(errorSpy).toBeCalled()
})
