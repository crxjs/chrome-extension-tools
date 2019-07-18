/* =========================================================== */
/*                       CONTENT SCRIPTS                       */
/* =========================================================== */

import { messages } from '@bumble/messages'
import unique from 'unique-selector'
import { fromEvent } from 'rxjs'

let lastElement: EventTarget | null = null

const selectorTypes = ['ID', 'Attributes', 'Class']

const attributesToIgnore = ['id', 'class', 'length', 'value']

fromEvent(document, 'contextmenu').subscribe((event) => {
  lastElement = event.target
})

messages.asyncOn(() => {
  return {
    selector:
      unique(lastElement, {
        selectorTypes,
        attributesToIgnore,
      }) || unique(lastElement),
  }
})
