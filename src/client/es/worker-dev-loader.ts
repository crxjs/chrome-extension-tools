/**
 * @preserve rollup-plugin-chrome-extension enables HMR during Vite serve mode
 * by intercepting fetch requests and routing them to the dev server.
 *
 * Service workers can only intercept requests inside their scope (folder),
 * so the service worker must be located at the root of the Chrome Extension
 * to handle all use cases.
 *
 * See https://stackoverflow.com/a/35780776/4842857 for more details.
 *
 * This import wrapper at the root of the Chrome Extension guarantees that
 * the background service worker will behave the same during
 * development and production.
 */
import 'http://localhost:%PORT%/@crx/worker-client'
import 'http://localhost:%PORT%/%PATH%'
