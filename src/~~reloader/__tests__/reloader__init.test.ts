import { useReloader } from '../index'
import { context } from '../../../__fixtures__/plugin-context'

jest.mock('../loadReloader', () =>
  jest.fn(() => ({
    name: 'mock-reloader',
    buildStart: jest.fn(),
    startReloader: jest.fn(),
    createClientFiles: jest.fn(),
    updateManifest: jest.fn(),
    reloadClients: jest.fn(),
  })),
)

beforeEach(() => {
  process.env.ROLLUP_WATCH = 'true'
})

afterAll(() => {
  delete process.env.ROLLUP_WATCH
})

test('if not watch mode ignore reloader option', () => {
  const reloader = 'non-persistent'
  delete process.env.ROLLUP_WATCH

  const plugin = useReloader({ reloader })

  expect(plugin).toMatchObject({
    name: 'no-reloader',
    generateBundle: expect.any(Function),
    writeBundle: expect.any(Function),
  })
})

test('loads non-persistent reloader', () => {
  const reloader = 'non-persistent'

  const plugin = useReloader({ reloader })

  expect(plugin).toMatchObject({
    name: expect.stringMatching(/non-persistent/i),
    generateBundle: expect.any(Function),
    writeBundle: expect.any(Function),
  })
})

test('loads persistent reloader', () => {
  const reloader = 'persistent'

  const plugin = useReloader({ reloader })

  expect(plugin).toMatchObject({
    name: expect.stringMatching(/persistent/i),
    generateBundle: expect.any(Function),
    writeBundle: expect.any(Function),
  })
})

test('calls load reloader', () => {
  const reloader = 'non-persistent'

  useReloader({ reloader })

  expect(loader.loadReloader).toBeCalledWith(reloader)
})

test('calls reloader#startReloader ', () => {
  const reloader = 'non-persistent'
  const plugin = useReloader({ reloader })

  const options = {}
  const bundle = {}
  plugin.generateBundle.call(context, options, bundle, false)
})

test.todo('returns real reloader') // name, generateBundle, writeBundle
