// Modify chrome.tabs.executeScript to inject browser polyfill
const _executeScript = chrome.tabs.executeScript
chrome.tabs.executeScript = (...args: any): void => {
  const tabId = typeof args[0] === 'number' ? args[0] : null

  // execute browser polyfill
  const polyfillArgs = (tabId === null ? ([] as any[]) : ([tabId] as any[])).concat([
    // TODO: convert to file to get replacements right
    { file: JSON.parse('%BROWSER_POLYFILL_PATH%') },
    () => {
      // execute original script
      _executeScript(...(args as [any, any, any]))
    },
  ])

  _executeScript(...(polyfillArgs as [any, any, any]))
}
