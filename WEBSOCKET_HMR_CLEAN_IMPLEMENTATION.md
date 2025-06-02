# Clean WebSocket HMR Implementation for CRXJS

## Overview

This is a clean, robust implementation of HMR for Chrome Extensions that works
within Chrome's security constraints. It combines file writing (required for
content scripts) with WebSocket signaling for a seamless development experience.

## Architecture

### Key Components

1. **`plugin-contentScriptHMR.ts`** - Main plugin that handles:

   - Writing transpiled content scripts to disk
   - Creating loader files with dynamic imports
   - Watching for file changes
   - Sending WebSocket signals for reloads

2. **`content-hmr-client.ts`** - Lightweight client that:

   - Listens for WebSocket HMR events
   - Handles page reloads when content scripts update
   - Manages visibility-aware reloading

3. **`plugin-devDistGenerator.ts`** - Handles service workers and extension
   pages:
   - Service workers can load from localhost with ES modules
   - Extension pages (popup/options) load scripts from localhost

## How It Works

### Content Scripts (File-Based)

```
Source Change → Vite Transform → Write to Disk → WebSocket Signal → Page Reload
```

1. Developer edits `content.ts`
2. Plugin transforms TypeScript to JavaScript
3. Writes `content-dev.js` with transpiled code
4. Creates `content-loader.js` with dynamic import
5. WebSocket signals the change
6. Page reloads to pick up new content script

### Service Workers & Extension Pages (Localhost-Based)

```
Source Change → Vite Dev Server → WebSocket Signal → Extension Reload
```

1. Developer edits `background.ts` or `popup.ts`
2. Vite serves the updated file from localhost
3. WebSocket signals the change
4. Extension reloads or page refreshes

## Implementation Details

### Content Script Loader Pattern

```javascript
// content-loader.js (auto-generated)
;(() => {
  import('./content-dev.js').catch((err) => {
    console.error('[CRXJS] Failed to load content script:', err)
  })
})()
```

### Manifest Transformation

```json
// Original manifest.json
{
  "content_scripts": [{
    "js": ["src/content.ts"]
  }]
}

// Transformed for development
{
  "content_scripts": [{
    "js": ["dist/src/content-loader.js"]
  }]
}
```

### HMR Client Integration

The HMR client is automatically injected into content scripts:

```javascript
// content-dev.js (auto-generated)
import '@crxjs/vite-plugin/client/es/content-hmr-client.js'
// ... rest of transpiled content script
```

## Advantages Over Original Implementation

1. **Clear Separation of Concerns**

   - File writing logic is isolated in one plugin
   - HMR client is a separate, testable module
   - WebSocket signaling is cleanly separated

2. **Robust Error Handling**

   - Graceful fallbacks for failed imports
   - Clear error messages in console
   - No silent failures

3. **Performance Optimized**

   - Only rebuilds changed files
   - Efficient file watching
   - Minimal overhead

4. **Developer Experience**
   - Visibility-aware reloading (waits if tab is hidden)
   - Clear console logging
   - Fast feedback loop

## Usage

Add the plugin to your Vite config:

```javascript
import { pluginContentScriptHMR } from '@crxjs/vite-plugin/plugin-contentScriptHMR'

export default {
  plugins: [
    pluginContentScriptHMR(),
    // ... other plugins
  ],
}
```

## Why This Approach?

1. **Chrome's Security Model** - Content scripts cannot load from external
   sources
2. **File Writing is Essential** - The only way to update content scripts during
   development
3. **WebSocket for Signaling** - Provides instant feedback without polling
4. **Dynamic Imports Work** - Chrome allows content scripts to use dynamic
   imports for local files

## Maintenance Benefits

- **Modular Design** - Easy to test and maintain individual components
- **Standard Vite Patterns** - Uses familiar Vite plugin APIs
- **Minimal Dependencies** - No complex RxJS streams or file watchers
- **Clear Data Flow** - Easy to trace how changes propagate

This implementation provides a clean, maintainable solution for Chrome Extension
HMR that works within browser constraints while delivering an excellent
developer experience.
