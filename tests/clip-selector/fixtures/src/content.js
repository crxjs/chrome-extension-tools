/* =========================================================== */
/*                       CONTENT SCRIPTS                       */
/* =========================================================== */

import { message } from '@bumble/chrome'
import unique from 'unique-selector'
import { fromEvent } from 'rxjs'

let lastElement = null

const selectorTypes = ['ID', 'Attributes', 'Class']

const attributesToIgnore = ['id', 'class', 'length', 'value']

fromEvent(document, 'contextmenu').forEach(event => {
  lastElement = event.target
})

message.listenForMessage().map(() => {
  return {
    selector:
      unique(lastElement, {
        selectorTypes,
        attributesToIgnore,
      }) || unique(lastElement),
  }
})
