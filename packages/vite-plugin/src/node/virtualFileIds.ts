export const viteClientId = '/@vite/client'
export const customElementsId = '/@webcomponents/custom-elements'
export const reactRefreshId = '/@react-refresh'

export const contentHmrPortId = '/@crx/client-port'
export const manifestId = '/@crx/manifest'
export const preambleId = '/@crx/client-preamble'
export const stubId = '/@crx/stub'
export const workerClientId = '/@crx/client-worker'
export const dynamicScriptId = '/@crx/dynamic'

/** Virtual module prefix for synthetic CSS content script entries */
export const contentCssPrefix = '/@crx/content-css/'

/** Check if an id is a synthetic CSS content script entry */
export function isContentCssId(id: string): boolean {
  return id.startsWith(contentCssPrefix)
}

/** Generate a synthetic CSS content script id for a given index */
export function getContentCssId(index: number): string {
  return `${contentCssPrefix}${index}`
}

/** Extract the index from a synthetic CSS content script id */
export function getContentCssIndex(id: string): number | null {
  if (!isContentCssId(id)) return null
  const indexStr = id.slice(contentCssPrefix.length)
  const index = parseInt(indexStr, 10)
  return isNaN(index) ? null : index
}
