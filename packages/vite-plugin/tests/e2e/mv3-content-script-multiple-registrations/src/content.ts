// This MAIN world content script is declared in two content_scripts entries
// with different matches. The dynamic import forces a loader file, and the
// import only resolves on pages covered by web_accessible_resources — so it
// must carry the matches of every registration, not just the last one.
;(async () => {
  const { createBanner } = await import('./banner')
  createBanner()
})().catch((err) => {
  console.error('[multiple-registrations] dynamic import failed', err)
})

export {}
