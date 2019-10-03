import { deriveFiles } from '../../src/manifest-input/manifest-parser/index'
import { dirname } from 'path'

const srcDir = 'src'
const manifest1Path = './fixtures/manifest1.json'
const manifest2Path = './fixtures/manifest2.json'
const manifest3Path =
  '/home/jack/Documents/Rollup/rollup-plugin-chrome-extension/tests/manifest-parser/fixtures/manifest.json'

test('manifest with options page', () => {
  const result = deriveFiles(
    {
      options_page: 'options.html',
    },
    srcDir,
  )

  expect(result).toEqual({
    js: [],
    html: ['src/options.html'],
    css: [],
    img: [],
  })
})

test('manifest with background.js', () => {
  const result = deriveFiles(
    {
      background: {
        scripts: ['background.js'],
      },
    },
    srcDir,
  )

  expect(result).toEqual({
    js: ['src/background.js'],
    html: [],
    css: [],
    img: [],
  })
})

test('manifest with background.html', () => {
  const result = deriveFiles(
    {
      background: {
        page: 'background.html',
      },
    },
    srcDir,
  )

  expect(result).toEqual({
    html: ['src/background.html'],
    js: [],
    css: [],
    img: [],
  })
})

test('manifest with background.ts', () => {
  const result = deriveFiles(
    {
      background: {
        scripts: ['background.ts'],
      },
    },
    srcDir,
  )

  expect(result).toEqual({
    js: ['src/background.ts'],
    html: [],
    css: [],
    img: [],
  })
})

test('manifest with content.css', () => {
  const result = deriveFiles(
    {
      content_scripts: [
        {
          css: ['content.css'],
        },
      ],
    },
    'css',
  )

  expect(result).toEqual({
    js: [],
    html: [],
    css: ['css/content.css'],
    img: [],
  })
})

test('manifest with content.js', () => {
  const result = deriveFiles(
    {
      content_scripts: [
        {
          js: ['content.js'],
        },
      ],
    },
    srcDir,
  )

  expect(result).toEqual({
    js: ['src/content.js'],
    html: [],
    css: [],
    img: [],
  })
})

test('manifest with content.ts', () => {
  const result = deriveFiles(
    {
      content_scripts: [
        {
          js: ['content.ts'],
        },
      ],
    },
    srcDir,
  )

  expect(result).toEqual({
    js: ['src/content.ts'],
    html: [],
    css: [],
    img: [],
  })
})

test('manifest 1', () => {
  const result = deriveFiles(require(manifest1Path), srcDir)

  expect(result).toEqual({
    img: [
      'src/images/clip64-icon-16.png',
      'src/images/clip64-icon-48.png',
      'src/images/clip64-icon-128.png',
    ],
    js: ['src/background.js'],
    html: [],
    css: [],
  })
})

test('manifest 2', () => {
  const result = deriveFiles(require(manifest2Path), srcDir)

  expect(result).toEqual({
    img: [
      'src/icon-16.png',
      'src/icon-48.png',
      'src/icon-128.png',
    ],
    js: [
      'src/background/chrome.message.bg.js',
      'src/background/init.bg.js',
      'src/utils/web.interval.js',
      'src/content/state.ct.js',
    ],
    html: ['src/options/options.html'],
    css: ['src/content/styles.ct.css'],
  })
})

test('web_accessible_resources', () => {
  const srcDir = dirname(manifest3Path)

  const result = deriveFiles(require(manifest3Path), srcDir)

  expect(result).toEqual({
    js: [srcDir + '/content/script.js'],
    css: [srcDir + '/styles/style.css'],
    html: [srcDir + '/options.html'],
    img: ['/img/icon1.png', '/img/icon2.png'].map(
      (p) => srcDir + p,
    ),
  })
})
