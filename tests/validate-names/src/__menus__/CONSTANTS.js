// @bumble/menus in Base64
export const domain = 'QGJ1bWJsZS9tZW51cw'

// Message types
export const show = `show_menu`
export const hide = `hide_menu`
export const element = 'last_element'

// Selector placeholder
export const selector = '%SELECTOR%'
export const id = '%OPTIONS_ID%'
export const invert = '%INVERT_SELECTOR%'.length > 0

export const cannotAccessError =
  'Cannot access contents of the page. Extension manifest must request permission to access the respective host.'
export const noOptionsIdError =
  'Context menu options.id must be defined.'
export const contextMenuExistsError =
  'Cannot create duplicate context menu.'
export const couldNotRemoveError =
  'Could not remove. Context menu id not found.'

export const contextTypes = [
  'all',
  'page',
  'frame',
  'selection',
  'link',
  'editable',
  'image',
  'video',
  'audio',
  'launcher',
  'browser_action',
  'page_action',
]
