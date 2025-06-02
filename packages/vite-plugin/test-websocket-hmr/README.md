# WebSocket HMR Test Extension

This is a test extension to verify the WebSocket-based HMR implementation for
CRXJS.

## Development Setup

### Build the main plugin first:

```bash
cd ../.. # Go to root
cd packages/vite-plugin
pnpm build
```

### Install dependencies:

```bash
cd packages/vite-plugin/test-websocket-hmr
pnpm install
```

### Development Mode:

1. Start the dev server:

   ```bash
   pnpm dev
   ```

2. In a separate terminal, run build when you make changes:

   ```bash
   pnpm build
   ```

3. Load the extension in Chrome:

   - Open `chrome://extensions`
   - Enable Developer mode
   - Click "Load unpacked"
   - Select the `dist` folder

4. After making changes:
   - Run `pnpm build`
   - Click the refresh button on the extension card in Chrome

### Testing:

1. **Background Script**:

   - Click "Inspect views: service worker" on the extension card
   - Check console for background script logs

2. **Content Script**:

   - Visit any webpage
   - Check the page console for content script logs
   - Look for the green indicator in the top-right corner

3. **Popup**:
   - Click the extension icon
   - Note: Currently has path issues that need fixing

## Known Issues

1. **Manual Reload Required**: Chrome extensions must be manually reloaded after
   changes
2. **Popup Path Issue**: The popup.html uses absolute paths that don't work in
   extensions
3. **Dev Server**: The dev server doesn't automatically rebuild - you need to
   run `pnpm build`

## What's Working

- ✅ Background scripts execute correctly
- ✅ Content scripts inject and run on all pages
- ✅ WebSocket infrastructure is in place
- ✅ CSP is configured for development
