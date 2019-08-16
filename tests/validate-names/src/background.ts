import {
  textStream,
  linkStream,
  imageStream,
} from './background/menus'
import * as state from './state'

/* -------------------------------------------- */
/*             RESET ON ACTION CLICK            */
/* -------------------------------------------- */

chrome.browserAction.onClicked.addListener(state.resetItems)
chrome.runtime.onInstalled.addListener(state.resetItems)

/* -------------------------------------------- */
/*                 DATA STREAMS                 */
/* -------------------------------------------- */

// TODO: addItem and removeItem streams are combined,
//   so toggles may behave unexpectedly
textStream.subscribe(state.toggleItem('text'))
linkStream.subscribe(state.toggleItem('link'))
imageStream.subscribe(state.toggleItem('image'))
