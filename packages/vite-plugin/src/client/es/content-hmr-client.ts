/**
 * Content Script HMR Client
 *
 * This lightweight client listens for HMR signals and reloads the page when
 * content scripts are updated.
 */

// Only initialize in development mode
if (import.meta.hot) {
  let pendingReload = false

  // Listen for custom HMR events
  import.meta.hot.on('crx:content-script-update', (data) => {
    console.log('[CRXJS] Content script updated:', data.file)

    // If tab is hidden, delay reload
    if (document.hidden) {
      pendingReload = true
      return
    }

    // Reload the page to get the new content script
    window.location.reload()
  })

  // Listen for full extension reload
  import.meta.hot.on('crx:runtime-reload', () => {
    console.log('[CRXJS] Extension reloading...')
    chrome.runtime.reload()
  })

  // Reload when tab becomes visible if we have a pending reload
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && pendingReload) {
      pendingReload = false
      window.location.reload()
    }
  })

  console.log('[CRXJS] Content script HMR client initialized')
}
