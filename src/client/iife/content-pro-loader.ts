;(async () => {
  await import(/* @vite-ignore */ chrome.runtime.getURL('%PATH%'))
})().catch(console.error)

export {}
