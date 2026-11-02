import { answer } from './shared.js'

// An export forces the module loader, and a page-global value proves MAIN world.
export function onExecute() {
  window.crxjsFirefoxMain = `${answer}:main`
}
