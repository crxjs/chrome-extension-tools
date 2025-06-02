# WebSocket HMR Implementation - Updated Findings

## MAJOR UPDATE: Chrome Now Supports Localhost in CSP!

Based on the Chromium issue #40790093, Chrome has been updated to allow
localhost sources in the Content Security Policy (CSP) for unpacked extensions.
This was fixed in December 2022.

### What This Means:

1. **Chrome extensions CAN now load scripts from localhost** (e.g.,
   `http://localhost:5174`) when running as unpacked extensions
2. **The CSP automatically includes localhost and 127.0.0.1** for unpacked
   extensions
3. **This is exactly what we need for HMR to work!**

## The Real Problem

The issue isn't that Chrome blocks localhost - it's that the CRXJS plugin isn't
properly utilizing this capability in dev mode.

### What Should Be Happening:

1. **Service Worker Loading**: The service-worker-loader.js should import from
   localhost:

   ```javascript
   // Instead of:
   import './assets/background.ts-57ae1651.js'

   // Should be:
   import 'http://localhost:5174/src/background.ts'
   ```

2. **Content Scripts**: Should load directly from the dev server:

   ```javascript
   // In manifest during dev mode:
   {
     "content_scripts": [{
       "js": ["http://localhost:5174/src/content.ts"],
       "matches": ["<all_urls>"]
     }]
   }
   ```

3. **HTML Files**: Should reference localhost URLs:

   ```html
   <!-- Instead of: -->
   <script src="/assets/popup.html-161a6a4a.js"></script>

   <!-- Should be: -->
   <script src="http://localhost:5174/src/popup.ts"></script>
   ```

## The Actual Issue

Looking at the current implementation:

1. **plugin-background.ts** correctly generates loader files for the service
   worker in dev mode
2. **plugin-manifest.ts** has the logic but isn't creating the dist folder in
   dev mode
3. **The manifest served by the dev server** shows raw source files, not
   transformed ones

## What's Actually Missing

### 1. **Dist Folder Generation in Dev Mode**

The plugin needs to create a minimal dist folder with:

- A transformed manifest.json
- A service-worker-loader.js that imports from localhost
- HTML files that reference localhost URLs

### 2. **Proper Manifest Transformation**

During dev mode, the manifest should be transformed to use localhost URLs:

```json
{
  "background": {
    "service_worker": "service-worker-loader.js",
    "type": "module"
  },
  "content_scripts": [
    {
      "js": ["content-loader.js"],
      "matches": ["<all_urls>"]
    }
  ]
}
```

Where each loader file imports from localhost.

### 3. **File Watching and Auto-Generation**

The plugin should:

1. Generate the dist folder on `vite dev` startup
2. Watch for manifest changes and regenerate
3. NOT need to regenerate on every source file change (Vite handles that)

## The Solution

We need to implement a simple plugin that:

```javascript
{
  name: 'crx:dev-dist-generator',
  apply: 'serve',
  configureServer(server) {
    // Generate dist folder on startup
    generateDevDist(manifest, server.config.server.port);

    // Watch manifest for changes
    server.watcher.add(path.resolve('manifest.json'));
    server.watcher.on('change', (file) => {
      if (file.endsWith('manifest.json')) {
        generateDevDist(manifest, server.config.server.port);
      }
    });
  }
}
```

Where `generateDevDist` creates:

1. **dist/manifest.json** - Points to loader files
2. **dist/service-worker-loader.js** - Imports from localhost
3. **dist/content-loader.js** - Imports from localhost
4. **dist/src/\*.html** - HTML files with localhost script tags

## Why This Will Work

1. **Chrome allows localhost for unpacked extensions** ✅
2. **Vite serves files over localhost** ✅
3. **WebSocket connection for HMR** ✅
4. **We just need the dist folder with proper loader files** ❌

## Conclusion

The WebSocket HMR implementation is almost complete. Chrome supports everything
we need. The only missing piece is generating a dist folder during dev mode with
loader files that import from localhost. This is a much simpler problem than
originally thought - we don't need a complex file system bridge, just a simple
dist folder generator that creates the right loader files.
