import cheerio from 'cheerio'
import { readFile } from 'fs-extra'
import { join } from 'path'
import { InputOptions } from 'rollup'
import { context } from '../../../__fixtures__/minimal-plugin-context'
import {
  assetJs,
  backgroundJs,
  faviconIco,
  faviconPng,
  kitchenSinkRoot,
  optionsCss,
  optionsHtml,
  optionsJpg,
  optionsJs,
  optionsJsx,
  optionsPng,
  optionsTs,
  optionsTsx,
  popupHtml,
  popupJs,
} from '../../../__fixtures__/mv2-kitchen-sink-paths'
import {
  getExtPath,
  getRelative,
} from '../../../__fixtures__/utils'
import { HtmlInputsPluginCache } from '../../plugin-options'
import htmlInputs from '../index'

const cheerioUtils = require('../cheerio')

const srcDir = join(
  process.cwd(),
  '__fixtures__/extensions/mv2-kitchen-sink',
)
const cache: HtmlInputsPluginCache = {
  css: [],
  html: [],
  html$: [],
  img: [],
  input: [],
  js: [],
  scripts: [],
}

const plugin = htmlInputs({ srcDir }, cache)

let options: InputOptions
beforeEach(() => {
  options = {
    input: [optionsHtml, popupHtml, backgroundJs],
  } as InputOptions

  cache.css = []
  cache.html = []
  cache.html$ = []
  cache.img = []
  cache.input = []
  cache.js = []
  cache.scripts = []
})

test('returns options.input as input record', () => {
  const result = plugin.options.call(context, options)

  expect(result).toMatchObject({
    input: {
      options1:
        '__fixtures__/extensions/mv2-kitchen-sink/options1.js',
      options2:
        '__fixtures__/extensions/mv2-kitchen-sink/options2.jsx',
      options3:
        '__fixtures__/extensions/mv2-kitchen-sink/options3.ts',
      options4:
        '__fixtures__/extensions/mv2-kitchen-sink/options4.tsx',
      'popup/popup':
        '__fixtures__/extensions/mv2-kitchen-sink/popup/popup.js',
      // External script paths won't be touched
      background: backgroundJs,
    },
  })
})

test('calls loadHtml', () => {
  const spy = jest.spyOn(cheerioUtils, 'loadHtml')
  const closureMock = jest.fn(
    cheerioUtils.loadHtml(kitchenSinkRoot),
  )
  spy.mockImplementation(() => closureMock)

  jest.clearAllMocks()

  plugin.options.call(context, options)

  expect(spy).toBeCalledTimes(1)

  expect(closureMock).toBeCalledTimes(2)
  expect(closureMock).toBeCalledWith(optionsHtml, 0, [
    optionsHtml,
    popupHtml,
  ])
  expect(closureMock).toBeCalledWith(popupHtml, 1, [
    optionsHtml,
    popupHtml,
  ])
})

test('caches correct inputs & assets', () => {
  // Cache should be empty before hook
  expect(cache.css).toEqual([])
  expect(cache.html).toEqual([])
  expect(cache.img).toEqual([])
  expect(cache.js).toEqual([])
  expect(cache.scripts).toEqual([])
  expect(cache.input).toEqual([])

  plugin.options.call(context, options)

  // js, jsx, ts, tsx
  expect(cache.js).toEqual(
    [optionsJs, optionsJsx, optionsTs, optionsTsx, popupJs].map(
      getRelative,
    ),
  )
  // cached options.input
  expect(cache.input).toEqual([
    backgroundJs,
    ...[
      optionsJs,
      optionsJsx,
      optionsTs,
      optionsTsx,
      popupJs,
    ].map(getRelative),
  ])
  // Assets to emit
  expect(cache.css).toEqual([optionsCss].map(getRelative))
  expect(cache.html).toEqual([optionsHtml, popupHtml])
  expect(cache.img).toEqual(
    expect.arrayContaining(
      [optionsPng, optionsJpg, faviconPng, faviconIco].map(
        getRelative,
      ),
    ),
  )
  // non-bundled js
  expect(cache.scripts).toEqual([assetJs].map(getRelative))
})

test('always parse HTML files', () => {
  cache.input = [optionsJs, popupHtml]

  const result = plugin.options.call(context, options)

  expect(result).toEqual({
    input: {
      background: expect.stringMatching(
        /__fixtures__\/extensions\/mv2-kitchen-sink\/background\.js$/,
      ),
      options1: expect.stringMatching(
        /__fixtures__\/extensions\/mv2-kitchen-sink\/options1\.js$/,
      ),
      options2: expect.stringMatching(
        /__fixtures__\/extensions\/mv2-kitchen-sink\/options2\.jsx$/,
      ),
      options3: expect.stringMatching(
        /__fixtures__\/extensions\/mv2-kitchen-sink\/options3\.ts$/,
      ),
      options4: expect.stringMatching(
        /__fixtures__\/extensions\/mv2-kitchen-sink\/options4\.tsx$/,
      ),
      'popup/popup': expect.stringMatching(
        /__fixtures__\/extensions\/mv2-kitchen-sink\/popup\/popup\.js$/,
      ),
    },
  })
})

test('modifies html source', async () => {
  const files = await Promise.all([
    await readFile(
      getExtPath('mv2-kitchen-sink/options-result.html'),
      'utf8',
    ),
    await readFile(
      getExtPath('mv2-kitchen-sink/popup-result.html'),
      'utf8',
    ),
  ])

  plugin.options.call(context, options)

  cache.html$.forEach(($, i) => {
    const result = $.html()
    const expected = cheerio.load(files[i]).html()

    expect(result).toBe(expected)
  })
})

test.skip('if cache.input exists, skip parsing html files', () => {
  cache.input = [optionsJs]

  const result = plugin.options.call(context, options)

  // FIXME: remove html files from options
  expect(result).toEqual({
    input: {
      background: expect.stringMatching(
        /__fixtures__\/extensions\/mv2-kitchen-sink\/background\.js$/,
      ),
      options1: expect.stringMatching(
        /__fixtures__\/extensions\/mv2-kitchen-sink\/options1\.js$/,
      ),
      options2: expect.stringMatching(
        /__fixtures__\/extensions\/mv2-kitchen-sink\/options2\.jsx$/,
      ),
      options3: expect.stringMatching(
        /__fixtures__\/extensions\/mv2-kitchen-sink\/options3\.ts$/,
      ),
      options4: expect.stringMatching(
        /__fixtures__\/extensions\/mv2-kitchen-sink\/options4\.tsx$/,
      ),
      'popup/popup': expect.stringMatching(
        /__fixtures__\/extensions\/mv2-kitchen-sink\/popup\/popup\.js$/,
      ),
    },
  })
})

test('if input has no html, do nothing', () => {
  const options = { input: [optionsJs] }

  const result = plugin.options.call(context, options)

  expect(result).toBe(options)
})

test('Throws with invalid input type', () => {
  // eslint-disable-next-line
  const options = { input: () => {} }

  const call = () => {
    // eslint-disable-next-line
    // @ts-ignore
    plugin.options.call(context, options)
  }

  expect(call).toThrow(
    new TypeError('options.input cannot be function'),
  )
})

test('Handles option.input as string', () => {
  const options = { input: optionsHtml }

  const result = plugin.options.call(context, options)

  expect(result).toMatchObject({
    input: {
      options1:
        '__fixtures__/extensions/mv2-kitchen-sink/options1.js',
      options2:
        '__fixtures__/extensions/mv2-kitchen-sink/options2.jsx',
      options3:
        '__fixtures__/extensions/mv2-kitchen-sink/options3.ts',
      options4:
        '__fixtures__/extensions/mv2-kitchen-sink/options4.tsx',
    },
  })
})

test('Handles options.browserPolyfill as true', () => {
  const plugin = htmlInputs(
    { srcDir, browserPolyfill: true },
    cache,
  )

  plugin.options.call(context, options)

  cache.html$.forEach(($) => {
    const head = $('head > script')
    expect(head.first().attr('src')).toBe(
      '/assets/browser-polyfill.js',
    )
    expect(head.next().attr('src')).toBe(
      '/assets/browser-polyfill-executeScript.js',
    )
  })
})

test('Handles options.browserPolyfill.executeScript as true', () => {
  const plugin = htmlInputs(
    { srcDir, browserPolyfill: { executeScript: true } },
    cache,
  )

  plugin.options.call(context, options)

  cache.html$.forEach(($) => {
    const head = $('head > script')

    expect(head.next().attr('src')).toBe(
      '/assets/browser-polyfill-executeScript.js',
    )
  })
})

test('Handles options.browserPolyfill.executeScript as false', () => {
  const plugin = htmlInputs(
    { srcDir, browserPolyfill: { executeScript: false } },
    cache,
  )

  plugin.options.call(context, options)

  cache.html$.forEach(($) => {
    const head = $('head > script')

    expect(head.first().attr('src')).toBe(
      '/assets/browser-polyfill.js',
    )
    expect(
      head.is(
        'script[src="/assets/browser-polyfill-executeScript.js"]',
      ),
    ).toBe(false)
  })
})
