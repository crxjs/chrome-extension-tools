import {
  querySelectorStream,
  selectorRemovedStream,
} from './querySelectorStream'
import { showMenu, hideMenu, lastElement } from './messages'
import { selector, invert } from './CONSTANTS'

const handleMouseOut = invert ? showMenu : hideMenu
const handleMouseOver = invert ? hideMenu : showMenu
function handleContextMenu({ target }) {
  lastElement(target)
}

// Get items that match, new items, and items changed to match
querySelectorStream(document.body, selector).subscribe((el) => {
  // console.log('querySelectorStream', selector, el)

  el.addEventListener('mouseout', handleMouseOut)
  el.addEventListener('mouseover', handleMouseOver)
})

selectorRemovedStream.subscribe((el) => {
  // console.log('selectorRemovedStream', selector, el)

  el.removeEventListener('mouseout', handleMouseOut)
  el.removeEventListener('mouseover', handleMouseOver)
})

console.log('script.code.js', selector)
document.body.addEventListener('contextmenu', handleContextMenu)
