/**
 * Add inline scripts before this comment.
 *
 * This runs as a module script, so the document body is ready by this time
 * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules#other_differences_between_modules_and_standard_scripts
 */

console.log('loader import.meta', import.meta)

try {
  for (const p of '%SCRIPTS%'.split(',')) {
    console.log('loading', p)
    await import(/* @vite-ignore */ p)
  }
} catch (error) {
  console.error(error)
}

export {}
