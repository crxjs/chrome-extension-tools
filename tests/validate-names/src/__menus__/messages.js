import { messages } from '@bumble/messages'
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

export const lastElement = ({ innerText }) => {
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
