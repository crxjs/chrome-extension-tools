import { tabs } from '@bumble/chrome-rxjs'
import { Subject, Subscription } from 'rxjs'
import {
  contextMenuExistsError,
  noOptionsIdError,
} from './CONSTANTS'
import { hideMenuStream, showMenuStream } from './messages'
import { optionsMap } from './optionsMap'
// @ts-ignore
// using legacy format
import code from './script.code.js'
// using new virtual module prefix
// import { code } from 'code ./script.js'
// import { filePath } from 'filePath ./script.js'
import {
  _createContextMenu,
  _executeScriptInTab,
  _removeContextMenu,
} from './_chrome'

/**
 * Observable of created context menu ids
 */
export const createContextMenuStream = new Subject<string>()

export async function createContextMenu({
  selector,
  invert = false,
  ...options
}: ContextMenuOptions): Promise<void> {
  /* ------------- VALIDATE OPTIONS ------------- */

  if (!options.id) {
    throw new TypeError(noOptionsIdError)
  }

  if (optionsMap.has(options.id)) {
    throw new Error(contextMenuExistsError)
  }

  if (invert && !selector) {
    // TODO: throw error if invert === true and no selector
  }

  let subscription: Subscription | null
  if (selector) {
    subscription = await createDynamicMenu(
      options,
      selector,
      invert,
    )
  } else {
    await _createContextMenu(options)
    subscription = null
  }
  /* ------------ UPDATE OPTIONS MAP ------------ */

  // TODO: adapt map to take unsubscribe
  optionsMap.set(options.id, [options, subscription])

  /* ----------- PUSH TO CREATE STREAM ---------- */

  createContextMenuStream.next(options.id)
}

export async function createDynamicMenu(
  options: ContextMenuOptions,
  selector: string,
  invert: boolean,
) {
  /* ---------- SHOW OR HIDE MENU ITEM ---------- */

  showMenuStream.subscribe(([{ id }]) => {
    if (id === options.id) {
      _createContextMenu(options).catch((error) => {
        console.error(error)
      })
    }
  })

  hideMenuStream.subscribe(([{ id }]) => {
    if (id === options.id) {
      _removeContextMenu(options.id).catch((error) => {
        console.error(error)
      })
    }
  })

  /* - INJECT CONTENT SCRIPT AS EACH PAGE LOADS - */

  // TODO: debounce/gather updates into groups and compose a single injection
  // TODO: teardown when menu is destroyed?
  //  - return unsubscribe from createDynamicMenu
  //  - add to optionsMap as [options, unsubscribe]
  const unsubscribe = tabs.updateStream.subscribe(
    ([tabId, changes, tab]) => {
      if (changes.status === 'loading') {
        _executeScriptInTab(tabId, {
          code: code
            .replace('%SELECTOR%', selector)
            .replace('%OPTIONS_ID%', options.id)
            .replace(
              '%INVERT_SELECTOR%',
              invert ? 'invert' : '',
            ),
        }).catch(({ message }) => {
          console.error(message)

          // if (message !== cannotAccessError) {
          //   console.error(message)
          // } else {
          //   // nobody cares
          // }
        })
      }
    },
  )

  if (invert) {
    // TODO: use private create
    await createContextMenu(options).catch((error) => {
      console.error(error)
    })
  }

  return unsubscribe
}
