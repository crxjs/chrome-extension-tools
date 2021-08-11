import { getBucket } from '@extend-chrome/storage'
import { Tabs } from 'webextension-polyfill'

export const tabIds = getBucket<{ id: Tabs.Tab['id'] }>('tabIds')
