import { messages } from '@bumble/messages'
import { fromEventPattern } from 'rxjs'
import { filter, debounce, debounceTime } from 'rxjs/operators'
// @ts-ignore
import { domain, show, hide, id, element } from './CONSTANTS'

// Use in content script to send command
export const showMenu = () => {
  console.log('showMenu')

  return messages.send({ type: show, domain, id })
}

// Use in content script to send command
export const hideMenu = () => {
  console.log('hideMenu')

  return messages.send({ type: hide, domain, id })
}

export const lastElement = ({ innerText }: HTMLElement) => {
  console.log('lastElement', innerText)

  messages.send({
    type: element,
    domain,
    id,
    // Update contextMenuClickStream here
    element: {
      innerText,
    },
  })
}

// Stream only messages with the domain
export const messageStream = fromEventPattern<
  [
    {
      type: string
      domain: string
      id: string
      // Update contextMenuClickStream here
      element: {
        innerText: string
      }
    },
    chrome.runtime.MessageSender
  ]
>(messages.on, messages.off).pipe(
  filter(([{ domain: d }]) => d === domain),
)

// Use in background page to receive
export const showMenuStream = messageStream.pipe(
  filter(([{ type }]) => type === show),
)

// Use in background page to receive
export const hideMenuStream = messageStream.pipe(
  filter(([{ type }]) => type === hide),
)

// Use in background page to receive
export const lastElementStream = messageStream.pipe(
  filter(([{ type }]) => type === element),
  // Multiple identical messages are sent by different menus at the same time
  debounceTime(25),
)

messageStream.subscribe(([message, sender]) => {
  console.log('messageStream', message)
})