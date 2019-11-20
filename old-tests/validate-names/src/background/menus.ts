import { filter, map } from 'rxjs/operators'
import {
  addItemMenuOptions,
  addItemId,
  removeItemMenuOptions,
  removeItemId,
} from '../MENU_OPTIONS'
import { menus } from '../__menus__/index'
import { merge } from 'rxjs'

export function isTrueString(data: any): data is string {
  return typeof data === 'string' && data.length > 0
}

/* -------------------------------------------- */
/*             CREATE CONTEXT MENUS             */
/* -------------------------------------------- */

menus.create(addItemMenuOptions).catch((error) => {
  console.error(error)
})
menus.create(removeItemMenuOptions).catch((error) => {
  console.error(error)
})

/* -------------------------------------------- */
/*                 CLICK STREAMS                */
/* -------------------------------------------- */

const addItemStream = menus.clickStream.pipe(
  filter(([{ menuItemId }]) => menuItemId === addItemId),
)
const removeItemStream = menus.clickStream.pipe(
  filter(([{ menuItemId }]) => menuItemId === removeItemId),
)

// Highlight images that match the src
export const imageStream = merge(
  addItemStream,
  removeItemStream,
).pipe(
  map(([{ srcUrl }]) => srcUrl),
  filter(isTrueString),
)

// Highlight links that match the href
// TODO: do not emit both link/image combos as link
export const linkStream = merge(
  addItemStream,
  removeItemStream,
).pipe(
  filter(([{ srcUrl }]) => !srcUrl),
  map(([{ linkUrl }]) => linkUrl),
  filter(isTrueString),
)

// Mark text that matches the selection
export const textStream = merge(
  addItemStream,
  removeItemStream,
).pipe(
  filter(([{ linkUrl }]) => !linkUrl),
  map(
    ([{ selectionText, element }]) =>
      selectionText || (element && element.innerText),
  ),
  filter(isTrueString),
)

// menus.clickStream.subscribe(([clickData]) => {
//   console.log('menus.clickStream', clickData)
// })
// addItemStream.subscribe((args) => {
//   console.log('addItemStream', args)
// })
// removeItemStream.subscribe((args) => {
//   console.log('removeItemStream', args)
// })
// imageStream.subscribe((args) => {
//   console.log('imageStream', args)
// })
// linkStream.subscribe((args) => {
//   console.log('linkStream', args)
// })
// textStream.subscribe((args) => {
//   console.log('textStream', args)
// })
