import { validate } from '../../../src/manifest-input/manifest-parser/validate'

test('passes valid manifest', () => {
  const throws = () => {
    validate({
      name: 'test-extension',
      manifest_version: 2,
      version: '1.1.1',
      description: 'Just a test extension',
      options_page: 'options.html',
      permissions: ['http://*.google.com/*', 'storage'],
    })
  }

  expect(throws).not.toThrow()
})

test('throws on undefined name', () => {
  const throws = () => {
    validate({
      // name should be defined
      name: undefined,
      manifest_version: 2,
      version: '1.1.1',
      description: 'Just a test extension',
      background: {
        persistent: true,
        scipts: ['reloader.js'],
      },
      permissions: ['http://*.google.com/*', 'storage'],
    })
  }

  expect(throws).toThrow()
})

test('throws on undefined version', () => {
  const throws = () => {
    validate({
      name: 'tests are great',
      manifest_version: 2,
      // version should be defined
      version: undefined,
      description: '',
      background: {
        persistent: true,
        scipts: ['reloader.js'],
      },
      permissions: ['http://*.google.com/*', 'storage'],
    })
  }

  expect(throws).toThrow()
})

test('throws on wrong type', () => {
  const throws = () => {
    validate({
      name: 'tests are great',
      manifest_version: 2,
      version: undefined,
      description: 'some tests are born great',
      // background should not be string
      background: 'reloader.js',
      permissions: ['http://*.google.com/*', 'storage'],
    })
  }

  expect(throws).toThrow()
})
