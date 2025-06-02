# WebSocket HMR Implementation - Technical Findings

## Understanding Vite's Architecture

After reviewing Vite's Plugin API, HMR API, and JavaScript API documentation,
here are the key findings about what's missing and what needs to be implemented
for a fully working WebSocket HMR system for Chrome Extensions.

## The Core Problem

Chrome Extensions have a fundamental limitation: they cannot load scripts from
HTTP URLs (like `http://localhost:5174`). They can only load from:

1. Files within the extension package (`chrome-extension://...`)
2. Local file paths

This creates a disconnect between Vite's dev server (which serves files over
HTTP) and Chrome's extension loading mechanism (which requires local files).

## What Vite Normally Does

In a typical web application:

1. Vite dev server serves files over HTTP
2. Browser loads files from `http://localhost:5173`
3. WebSocket connection established for HMR
4. File changes trigger WebSocket messages
5. Client receives updates and hot-reloads modules

## What's Missing for Chrome Extensions

### 1. **File System Bridge (The Missing Link)**

The removed fileWriter system was providing this critical functionality:

- Created physical files in the `dist` folder during development
- These files were special "loader" files that would fetch from the dev server
- Chrome could load these physical files, which would then fetch the actual code
  from Vite

Without this bridge, there's no way for Chrome to load the extension files.

### 2. **Plugin Hooks Not Implemented for Dev Mode**

Looking at the current implementation:

- The `generateBundle` hook only runs during build (`vite build`)
- No hooks are creating files during dev server mode (`vite dev`)
- The manifest transformation happens but doesn't output files

### 3. **Missing Dev Server Integration**

What should happen:

```javascript
// In configureServer hook
configureServer(server) {
  // Watch for file changes
  server.watcher.on('change', (file) => {
    // Update dist files
    // Trigger extension reload
  })

  // Create initial dist files on server start
  server.httpServer.on('listening', () => {
    // Generate loader files in dist/
  })
}
```

## What Needs to Be Implemented

### 1. **Dev Mode File Generation**

```javascript
{
  name: 'crx:dev-files',
  apply: 'serve',
  configureServer(server) {
    // Create dist folder with loader files
    createDevLoaderFiles({
      manifest: transformedManifest,
      port: server.config.server.port
    })
  }
}
```

### 2. **Loader File Structure**

For each script in the manifest, create a loader file:

**dist/src/background.js** (loader):

```javascript
// This file exists on disk so Chrome can load it
import('http://localhost:5174/src/background.ts')
```

**dist/src/content.js** (loader):

```javascript
// Inject HMR client
import('http://localhost:5174/@vite/client')
import('http://localhost:5174/src/content.ts')
```

### 3. **Manifest Transformation for Dev**

The manifest in dev mode should point to the loader files:

```json
{
  "background": {
    "service_worker": "src/background.js", // loader file
    "type": "module"
  },
  "content_scripts": [
    {
      "js": ["src/content.js"], // loader file
      "matches": ["<all_urls>"]
    }
  ]
}
```

### 4. **WebSocket Extension Reload**

```javascript
// In handleHotUpdate hook
handleHotUpdate({ file, server }) {
  if (isExtensionFile(file)) {
    // Send custom event to trigger extension reload
    server.ws.send({
      type: 'custom',
      event: 'crx:extension-reload'
    })
  }
}
```

### 5. **Client-Side Extension Reload**

```javascript
// In the service worker
if (import.meta.hot) {
  import.meta.hot.on('crx:extension-reload', () => {
    chrome.runtime.reload()
  })
}
```

## Why Current Implementation Doesn't Work

1. **No Dev Mode File Generation**: The plugin only generates files during
   build, not during dev server
2. **No File System Bridge**: Chrome can't load from HTTP URLs, needs physical
   files
3. **Incomplete WebSocket Integration**: Infrastructure exists but no automatic
   reload mechanism
4. **Missing configureServer Hook**: No server configuration to handle dev mode
   properly

## The Complete Solution Would:

1. **On `vite dev` startup**:

   - Create a `dist` folder
   - Generate loader files for all manifest entries
   - Transform manifest to point to loader files
   - Start WebSocket server for HMR

2. **On file change**:

   - Vite dev server updates its in-memory modules
   - WebSocket sends update to extension
   - Extension either hot-reloads the module OR triggers full reload

3. **For content scripts**:

   - Inject Vite HMR client
   - Establish WebSocket connection
   - Handle module updates

4. **For service worker**:
   - More limited HMR (service workers have restrictions)
   - Fallback to full extension reload

## Implementation Approach

To make this work, we need to:

1. **Restore File Generation in Dev Mode**:

   ```javascript
   // In plugin-manifest.ts or new plugin
   configureServer(server) {
     // Generate initial files
     await generateDevFiles(manifest, server.config)

     // Watch for changes
     server.watcher.on('all', async (event, path) => {
       if (shouldRegenerate(path)) {
         await generateDevFiles(manifest, server.config)
       }
     })
   }
   ```

2. **Create Loader Files**:

   ```javascript
   function generateLoaderFile(scriptPath, serverPort) {
     return `
       import 'http://localhost:${serverPort}/@vite/client'
       import 'http://localhost:${serverPort}/${scriptPath}'
     `
   }
   ```

3. **Handle Extension Reload**:
   ```javascript
   // Send reload command via WebSocket
   server.ws.send({
     type: 'custom',
     event: 'crx:runtime-reload',
   })
   ```

## Conclusion

The WebSocket infrastructure is in place, but the critical file system bridge
that allows Chrome Extensions to load from Vite's dev server is missing. Without
generating physical loader files that Chrome can read, the dev server cannot
serve extension files properly.

The solution requires implementing a `configureServer` hook that:

1. Generates loader files in a dist folder
2. Watches for changes and updates these files
3. Triggers extension reloads via WebSocket

This is what the removed fileWriter system was doing, and it needs to be
replaced with a simpler implementation focused just on dev mode needs.
