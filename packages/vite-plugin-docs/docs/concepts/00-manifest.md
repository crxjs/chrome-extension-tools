---
position: 0
title: Manifest JSON
id: manifest
---

# Extension Manifest

CRXJS parses the manifest to discover what entry files your extension uses.
Because we import the manifest into the Vite config, you can use JSON,
JavaScript, or TypeScript.

## TypeScript

CRXJS exports a helper function called `defineManifest`. It's similar to Vite's
`defineConfig` and supports autocompletion and dynamic or async definitions.

:::tip Did you know?

Chrome Extensions don't use Semver. Read more about the Chrome Extension version
format in the
[Google Developer Docs](https://developer.chrome.com/docs/extensions/mv3/manifest/version/).

:::

The following example uses the version from `package.json` and dynamically sets
the name depending on Vite's mode.

```typescript title=manifest.config.ts
import { defineManifest } from '@crxjs/vite-plugin'
import packageJson from './package.json'
const { version } = packageJson

// Convert from Semver (example: 0.1.0-beta6)
const [major, minor, patch, label = '0'] = version
  // can only contain digits, dots, or dash
  .replace(/[^\d.-]+/g, '')
  // split into version parts
  .split(/[.-]/)

export default defineManifest(async (env) => ({
  manifest_version: 3,
  name:
    env.mode === 'staging'
      ? '[INTERNAL] CRXJS Power Tools'
      : 'CRXJS Power Tools',
  // up to four numbers separated by dots
  version: `${major}.${minor}.${patch}.${label}`,
  // semver is OK in "version_name"
  version_name: version,
}))
```

## Manifest Paths

Paths inside the manifest are relative to the
[Vite project root](https://vitejs.dev/guide/#index-html-and-project-root), so
the location of the manifest file doesn't matter.

:::tip Use paths that start with a letter

```json title=manifest.json
{
  "options_page": "options.html",
  "devtools_page": "pages/devtools.html"
}
```

:::

:::danger Don't use relative or absolute paths

```json title=manifest.json
{
  "options_page": "./options.html",
  "devtools_page": "/root/user/.../devtools.html"
}
```

:::

## JSON Schema

If you're using a JSON file, consider using a schema like the one at
[JSON Schema Store](https://json.schemastore.org/chrome-manifest.json) to take
advantage of autocompletion and validation.

You can configure VSCode to use a JSON schema by adding this to your settings
file:

```json title=settings.json
{
  "json.schemas": [
    {
      "fileMatch": ["manifest.json"],
      "url": "https://json.schemastore.org/chrome-manifest.json"
    }
  ]
}
```
