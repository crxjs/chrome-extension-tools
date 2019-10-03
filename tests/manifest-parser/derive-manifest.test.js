import { deriveManifest } from '../../src/manifest-input/manifest-parser/index'

const manifest = {
  name: 'Test Extension',
  version: '1.1.1',
  description: 'Just a test extension',
  options_page: 'options.html',
  permissions: ['http://*.google.com/*', 'storage'],
}

const permissions = ['alarms', 'tabs']

test('combine permissions', () => {
  const result = deriveManifest(manifest, permissions)

  expect(result).toEqual({
    description: 'Just a test extension',
    manifest_version: 2,
    name: 'Test Extension',
    options_page: 'options.html',
    permissions: [
      'alarms',
      'tabs',
      'http://*.google.com/*',
      'storage',
    ],
    version: '1.1.1',
  })
})

test('exclude permissions', () => {
  const result = deriveManifest(
    manifest,
    permissions.concat('!storage'),
  )

  expect(result).toEqual({
    description: 'Just a test extension',
    manifest_version: 2,
    name: 'Test Extension',
    options_page: 'options.html',
    permissions: ['alarms', 'tabs', 'http://*.google.com/*'],
    version: '1.1.1',
  })
})
