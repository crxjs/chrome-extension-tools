// the dynamic import forces a loader file, so the imported chunk is only
// usable on pages covered by web_accessible_resources
;(async () => {
  const { logMessage } = await import('./message.js')
  logMessage()
})().catch(console.error)
