import { pushReloader, PushReloaderPlugin } from '..'

beforeEach(() => {
  process.env.ROLLUP_WATCH = 'true'
})

test('should return plugin in watch mode', () => {
  const plugin = pushReloader()

  expect(plugin).toMatchObject<PushReloaderPlugin>({
    name: 'chrome-extension-push-reloader',
    buildStart: expect.any(Function),
    generateBundle: expect.any(Function),
    writeBundle: expect.any(Function),
  })
})

test('should return undefined when not in watch mode', () => {
  delete process.env.ROLLUP_WATCH
  
  const plugin = pushReloader()

  expect(plugin).toBeUndefined()
})
