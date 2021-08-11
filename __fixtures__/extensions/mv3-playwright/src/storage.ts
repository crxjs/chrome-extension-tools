import { getBucket } from '@extend-chrome/storage'

export const tabIds = getBucket<{ id: chrome.tabs.Tab['id'] }>(
  'tabIds',
)
