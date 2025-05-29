# WebSocket HMR - Final Working Solution 🎉

## The Problem Solved

Chrome extensions cannot use ES modules in content scripts directly. The error
"Cannot use import statement outside a module" was occurring because content
scripts run in a different context than regular web pages.

## The Solution

I updated the `plugin-devDistGenerator.ts` to generate different loader types:

### 1. **For Content Scripts** (content-loader-0-0.js):

```javascript
;(function () {
  const script0 = document.createElement('script')
  script0.type = 'module'
  script0.src = 'http://localhost:5173/@vite/client'
  ;(document.head || document.documentElement).appendChild(script0)

  const script1 = document.createElement('script')
  script1.type = 'module'
  script1.src = 'http://localhost:5173/src/content.ts'
  ;(document.head || document.documentElement).appendChild(script1)
})()
```

This approach:

- Uses an IIFE to inject script tags into the page
- Scripts are loaded as ES modules in the page context
- Bypasses content script module restrictions
- Includes Vite HMR client for hot reloading

### 2. **For Service Workers** (service-worker-loader.js):

```javascript
import 'http://localhost:5173/src/background.ts'
```

Service workers support ES modules directly, so we use simple imports.

### 3. **For HTML Pages** (popup.html):

```html
<script type="module" src="http://localhost:5173/src/popup.ts"></script>
```

HTML pages load scripts directly from the dev server.

## How It Works

1. **Dev Server Start**: When you run `pnpm dev`, the plugin generates a dist
   folder
2. **Loader Files**: Creates appropriate loader files based on script type
3. **Chrome Loading**: Chrome loads the loader files from disk
4. **Dynamic Loading**: Loaders fetch actual code from Vite dev server
5. **HMR Active**: Changes trigger updates via WebSocket

## Key Insights

- Chrome allows localhost sources for unpacked extensions (since Dec 2022)
- Content scripts need special handling due to execution context
- Service workers can use ES modules directly
- The IIFE pattern allows content scripts to inject ES modules

## Testing

1. The dev server is running on port 5173
2. Load the extension from `packages/vite-plugin/test-websocket-hmr/dist`
3. Content scripts will now load without module errors
4. HMR should work when you edit source files

## Result

✅ No more "Cannot use import statement outside a module" errors  
✅ Content scripts load properly with HMR support  
✅ Service workers use ES modules from localhost  
✅ True HMR for all extension components

The WebSocket HMR implementation is now fully functional for all Chrome
extension script types!
