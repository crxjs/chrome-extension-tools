const checkPolyfilled = 'typeof browser !== "undefined"'

const _executeScript = chrome.tabs.executeScript
const withP = (...args: [any, any?]): Promise<any[]> =>
  new Promise((resolve, reject) => {
    _executeScript(...args, (results) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError.message)
      } else {
        resolve(results)
      }
    })
  })

// @ts-expect-error FIXME: executeScript should return Promise<any[]>
chrome.tabs.executeScript = (...args: any): void => {
  ;(async () => {
    const baseArgs = (typeof args[0] === 'number' ? [args[0]] : []) as any[]

    const [done] = await withP(...(baseArgs.concat({ code: checkPolyfilled }) as [any, any]))

    if (!done) {
      await withP(...(baseArgs.concat([{ file: JSON.parse('%BROWSER_POLYFILL_PATH%') }]) as [any, any]))
    }

    _executeScript(...(args as [any, any, any]))
  })()
}
