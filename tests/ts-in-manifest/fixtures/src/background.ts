import { contextMenus } from '@bumble/chrome-rxjs'
import { clipboard, notifyCopy } from '@bumble/clipboard'
import { messages } from '@bumble/messages'
import { filter } from 'rxjs/operators'
// import { log } from '@bumble/rxjs-log'

const cmid = 'Clip-selector'
const title = 'Clip-selector'
const contexts = [
  'page',
  'frame',
  'link',
  'editable',
  'image',
  'video',
  'audio',
]

chrome.contextMenus.create({ id: cmid, title, contexts })

contextMenus.click$
  .pipe(filter(([info]) => info.menuItemId === cmid))
  .subscribe(([, { id }]) =>
    messages
      .asyncSend({ greeting: 'get-selector' }, id)
      .then(({ selector: s }: { selector: string }) => s)
      .then(clipboard.writeText)
      .then(notifyCopy),
  )
