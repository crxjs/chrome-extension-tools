import { storage } from '@bumble/storage'

export interface Item {
  data: string
  type: string
  color: number
}

export interface State {
  items: {
    [prop: string]: Item
  }
  color: number
}

export interface StateChange {
  items?: chrome.storage.StorageChange
  color?: chrome.storage.StorageChange
}

export interface Unwrapper {
  (state: State | StateChange): any
}

export const initialState: State = {
  items: {},
  color: 0,
}

export const getNewValue = ({
  newValue,
}: chrome.storage.StorageChange) => {
  return newValue
}

export async function resetItems() {
  console.log('resetItems')

  await storage.local.clear()
  storage.local.set(initialState)
}

// TODO: this should be divided into add and remove
export function toggleItem(type: string) {
  return (data: string): void => {
    storage.local.set(({ items, color }) => {
      const key = JSON.stringify(data.toLowerCase().trim())

      if (key in items) {
        delete items[key]
        return { items }
      }

      const item: Item = {
        data,
        color,
        type,
      }

      console.log('setType', type, item)

      return {
        items: { ...items, [key]: item },
        color: color < 20 ? color + 1 : 0,
      }
    })
  }
}
