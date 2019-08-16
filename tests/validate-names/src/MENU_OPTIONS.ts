import { multiFindClass } from './CLASS_NAMES'

export const addItemId = 'add-item'
export const removeItemId = 'remove-item'

// Add item context menu
export const addItemMenuOptions: ContextMenuOptions = {
  id: addItemId,
  title: 'Add Multifind item...',
  contexts: ['selection', 'link', 'image'],
  selector: multiFindClass,
  invert: true,
}

// Remove text context menu
export const removeItemMenuOptions: ContextMenuOptions = {
  id: removeItemId,
  title: 'Remove Multifind item...',
  contexts: ['page', 'link', 'image'],
  selector: multiFindClass,
}
