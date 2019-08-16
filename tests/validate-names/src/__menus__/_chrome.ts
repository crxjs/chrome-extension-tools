/**
 * The old Chrome API with Promises
 * @param options ContextMenuOptions
 * @param key contextMenuMap key
 */
export const _createContextMenu = (
  options: chrome.contextMenus.CreateProperties,
): Promise<void> =>
  new Promise((resolve, reject) => {
    chrome.contextMenus.create(options, () => {
      const { message = '' } = chrome.runtime.lastError || {}

      if (message && !message.includes('duplicate id')) {
        reject(new Error(message))
      } else {
        resolve()
      }
    })
  })

/**
 * The old Chrome API with Promises
 * @param options ContextMenuOptions
 * @param key contextMenuMap key
 */
export const _updateContextMenu = (
  id: string,
  options: chrome.contextMenus.UpdateProperties,
): Promise<void> =>
  new Promise((resolve, reject) => {
    chrome.contextMenus.update(id, options, () => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message))
      } else {
        resolve()
      }
    })
  })

/**
 * Use key to manage contextMenuMap<key, ContextMenuOptions[]>
 * @param id contextMenuMap key
 */
export const _removeContextMenu = (id: string): Promise<void> =>
  new Promise((resolve, reject) => {
    chrome.contextMenus.remove(id, () => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message))
      } else {
        resolve()
      }
    })
  })

/**
 * Remove all context menus and clear contextMenuMap
 */
export const _removeAllContextMenus = (): Promise<void> =>
  new Promise((resolve, reject) => {
    chrome.contextMenus.removeAll(() => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message))
      } else {
        resolve()
      }
    })
  })

export const _executeScriptInTab = (
  tabId: number,
  options: chrome.tabs.InjectDetails,
): Promise<any[]> =>
  new Promise((resolve, reject) => {
    chrome.tabs.executeScript(tabId, options, (result) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message))
      } else {
        resolve(result)
      }
    })
  })
