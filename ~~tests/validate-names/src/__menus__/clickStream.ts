import { contextMenus } from '@bumble/chrome-rxjs'
import { lastElementStream } from './messages'
import { withLatestFrom, map } from 'rxjs/operators'
import { Observable } from 'rxjs'

export const contextMenuClickStream: Observable<
  [MenuClickData, chrome.tabs.Tab]
> = contextMenus.clickStream.pipe(
  withLatestFrom(lastElementStream),
  map(([[clickData, tab], [message]]) => [
    { ...clickData, element: message.element },
    tab,
  ]),
)

contextMenus.clickStream.subscribe((args) => {
  console.log('contextMenus.clickStream', args)
})

lastElementStream.subscribe((args) => {
  console.log('lastElementStream', args)
})
