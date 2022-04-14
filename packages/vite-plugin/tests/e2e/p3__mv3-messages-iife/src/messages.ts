import { getMessage } from '@extend-chrome/messages'

export const [sendBgCheck, bgCheckStream] = getMessage<
  undefined,
  Pick<chrome.tabs.Tab, 'id'>
>('background check', { async: true })

export const [sendBgOk, bgOkStream] = getMessage<undefined>('background ok')

export const [sendOptOk, optOkStream] = getMessage<undefined>('options ok')
