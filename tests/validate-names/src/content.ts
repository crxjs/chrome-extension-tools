/* =========================================================== */
/*                       CONTENT SCRIPTS                       */
/* =========================================================== */

import { imageClassName, linkClassName } from './CLASS_NAMES'
import {
  markImages,
  markLinks,
  markText,
  unmarkAll,
  unmarkByClassName,
  unmarkText,
} from './content/markers'
import {
  clearItemsStream,
  imageItemsStream,
  linkItemsStream,
  textItemsStream,
} from './content/storage'

clearItemsStream.subscribe(unmarkAll)

/* -------------------------------------------- */
/*         HIGHLIGHT WORD BY TEXT SEARCH        */
/* -------------------------------------------- */

textItemsStream.subscribe((items) => {
  unmarkText()

  items.forEach(markText)
})

/* -------------------------------------------- */
/*            HIGHLIGHT LINK BY HREF            */
/* -------------------------------------------- */

linkItemsStream.subscribe((items) => {
  unmarkByClassName(linkClassName)

  items.forEach((item) => {
    markLinks(item)

    if (item.data.startsWith(location.protocol)) {
      const data = item.data.replace(location.protocol, '')

      markLinks({ ...item, data })
    }

    if (item.data.startsWith(location.origin)) {
      const data = item.data.replace(location.origin, '')

      markLinks({ ...item, data })
    }
  })
})

/* -------------------------------------------- */
/*         HIGHLIGHT IMAGE BY SRC/SRCSET        */
/* -------------------------------------------- */

imageItemsStream.subscribe((items) => {
  unmarkByClassName(imageClassName)

  items.forEach((item) => {
    markImages(item)

    if (item.data.startsWith(location.origin)) {
      const data = item.data.replace(location.origin, '')

      markImages({ ...item, data })
    } else if (item.data.startsWith(location.protocol)) {
      const data = item.data.replace(location.protocol, '')

      markImages({ ...item, data })
    }
  })
})
