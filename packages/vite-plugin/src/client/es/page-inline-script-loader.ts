/**
 * Add inline scripts before this comment.
 *
 * This runs as a module script, so the document body is ready by this time
 * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules#other_differences_between_modules_and_standard_scripts
 */

declare const SCRIPTS: string

try {
  for (const p of JSON.parse(SCRIPTS)) {
    const url = new URL(p, 'https://stub')
    // add a timestamp to force Chrome to do a new request
    url.searchParams.set('t', Date.now().toString())
    const req = url.pathname + url.search
    await import(/* @vite-ignore */ req)
  }
} catch (error) {
  console.error(error)
}

export {}
