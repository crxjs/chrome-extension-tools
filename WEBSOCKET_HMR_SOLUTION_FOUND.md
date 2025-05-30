# WebSocket HMR Solution - The Missing Piece

## The Discovery

After examining the chrome-extension-boilerplate-react-vite project's HMR
implementation, I discovered they're using the **same approach as the original
fileWriter system** - they write transpiled files to disk!

## Their Approach

### 1. File Writing Strategy

```javascript
// They create _dev.js versions of files
const newFileName = fileName.replace('.js', '_dev.js')
safeWriteFileSync(resolve(outputDir, newFileName), module.code)
```

### 2. Content Script Loading

Instead of trying to load from localhost, they create a small loader:

```javascript
// The main content.js file just contains:
import('./content_dev.js')
```

This works because:

- Chrome can load the local `content.js` file
- That file uses dynamic import to load `content_dev.js`
- When source changes, they rewrite `content_dev.js`
- The WebSocket signals a reload

### 3. WebSocket Role

The WebSocket is ONLY used for:

- Signaling when files have been rebuilt
- Triggering extension reload or page refresh
- NOT for serving code

## Key Insights

1. **You cannot bypass Chrome's security model** - Content scripts cannot load
   from external sources
2. **File writing is essential** - The transpiled code must exist as actual
   files
3. **WebSocket is just for signaling** - Not for code delivery
4. **Dynamic imports work** - Chrome allows content scripts to use dynamic
   imports for local files

## The Solution Pattern

```
Source File Changes
    ↓
Vite/Rollup Build
    ↓
Write to Disk (content_dev.js)
    ↓
WebSocket Signal
    ↓
Reload Extension/Page
    ↓
Chrome Loads New Files
```

## Conclusion

The original fileWriter system wasn't outdated or unnecessary - it's the ONLY
way to achieve HMR for content scripts. The chrome-extension-boilerplate project
confirms this by using the exact same approach.

The task of "converting to WebSocket-only" is fundamentally impossible for
content scripts. The fileWriter must be restored or reimplemented.
