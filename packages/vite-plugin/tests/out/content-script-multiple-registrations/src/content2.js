// declared with <all_urls> plus a narrower match_about_blank entry; the
// web_accessible_resources matches should collapse to just <all_urls>
;(async () => {
  const { logMessage } = await import('./message.js')
  logMessage()
})().catch(console.error)
