# WebSocket HMR Implementation - Limitations Discovered

## The Fundamental Problem

After extensive testing and implementation attempts, we've discovered
fundamental limitations that prevent true HMR for Chrome extension content
scripts using only WebSocket connections.

## What We Tried

### 1. Direct ES Module Imports (First Attempt)

```javascript
import 'http://localhost:5173/@vite/client'
import 'http://localhost:5173/src/content.ts'
```

**Result**: `Cannot use import statement outside a module` - Content scripts
don't support ES modules

### 2. Script Tag Injection (Second Attempt)

```javascript
const script = document.createElement('script')
script.type = 'module'
script.src = 'http://localhost:5173/src/content.ts'
document.head.appendChild(script)
```

**Result**: `ERR_ACCESS_DENIED` - Chrome blocks content scripts from injecting
external scripts

### 3. Fetch and Eval (Third Attempt)

```javascript
const response = await fetch('http://localhost:5173/src/content.ts')
const code = await response.text()
const script = document.createElement('script')
script.textContent = code
document.head.appendChild(script)
```

**Result**: CORS errors - Content scripts cannot fetch from localhost

## The Core Limitations

1. **Content Script Isolation**: Content scripts run in an isolated world with
   strict security policies
2. **No External Scripts**: Chrome prevents content scripts from loading any
   external resources
3. **CORS Restrictions**: Even with localhost allowed for unpacked extensions,
   content scripts still face CORS blocks
4. **No ES Modules**: Content scripts cannot use ES module syntax directly

## What Works vs What Doesn't

### ✅ What Works:

- **Service Workers**: Can use ES modules and import from localhost
- **Extension Pages** (popup, options): Can load scripts from localhost
- **Background Scripts**: Full localhost access with proper manifest
  configuration

### ❌ What Doesn't Work:

- **Content Scripts**: Cannot load from localhost in any way
- **Dynamic Imports**: Blocked by Chrome's security model
- **Script Injection**: Prevented by CSP and security policies

## The Only Real Solution

The fileWriter system that was removed was the only working solution because it:

1. Transpiled TypeScript to JavaScript during development
2. Wrote the actual JavaScript files to disk
3. Chrome loaded these local files directly
4. File watching triggered rewrites and extension reloads

## Conclusion

While we successfully implemented:

- ✅ Dev mode dist generation
- ✅ Service worker module loading from localhost
- ✅ HTML page script loading from localhost
- ✅ WebSocket connection for reload events

We cannot achieve true HMR for content scripts without writing transpiled files
to disk. The WebSocket approach alone is insufficient due to Chrome's security
model.

The original fileWriter system wasn't just a "nice to have" - it was essential
for content script development with HMR.
