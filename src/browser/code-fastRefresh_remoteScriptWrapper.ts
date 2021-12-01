import { eventName } from './fastRefresh_helpers'

/**
 * This script is present because `rollup-plugin-chrome-extension` detected
 * an inline script during development.
 *
 * @vitejs/plugin-react adds a Fast Refresh prelude to HTML pages as an inline script.
 * The prelude must run before any React code. An inline script guarantees this.
 *
 * The Chrome Extension default CSP blocks inline script tags.
 *
 * In MV3, we can't add a hash to the CSP. Instead, we wrap all JSX and TSX script tags
 * with a dynamic import that delays until the prelude is done.
 *
 * This requires users to observe a convention: All scripts that expect
 * to use React Fast Refresh must use the JSX or TSX extension.
 *
 * The code below performs the dynamic import when the preamble is complete,
 * or immediately if it is present.
 */

const importPath = JSON.parse('%REMOTE_SCRIPT_PATH%')
const importHandler = () => {
  window.removeEventListener(eventName, importHandler)
  import(/* @vite-ignore */ importPath).catch((err) => {
    console.error(`Could not import "${importPath}":`)
    console.error(err)
  })
  // .then(() => {
  //   console.log(`Import success: ${importPath}`)
  // })
}

if ((window as any).__vite_plugin_react_preamble_installed__) {
  importHandler()
} else {
  window.addEventListener(eventName, importHandler)
}
