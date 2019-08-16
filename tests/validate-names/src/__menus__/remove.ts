import { _removeContextMenu } from './_chrome'
import { optionsMap } from './optionsMap'
// @ts-ignore
import { couldNotRemoveError } from './CONSTANTS'
import { Subject } from 'rxjs'

export const removeContextMenuStream = new Subject<string>()

export const removeContextMenu = async (id: string) => {
  /* ---------------- VALIDATE ID --------------- */
  const [options, subscription] = optionsMap.get(id) || [
    null,
    null,
  ]

  if (!options) {
    throw new Error(couldNotRemoveError)
  }

  /* ----------- TEARDOWN DYNAMIC MENU ---------- */

  if (subscription) {
    subscription.unsubscribe()
  }

  /* ------------ REMOVE CONTEXT MENU ----------- */

  await _removeContextMenu(id).catch(() => {
    // supress cannot remove error
  })

  /* ------------ UPDATE OPTIONS MAP ------------ */

  optionsMap.delete(id)

  /* ----------- PUSH TO REMOVE STREAM ---------- */

  removeContextMenuStream.next(id)
}
