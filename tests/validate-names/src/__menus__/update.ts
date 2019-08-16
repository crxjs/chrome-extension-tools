import { Subject } from 'rxjs'
import { optionsMap } from './optionsMap'
// @ts-ignore
import { noOptionsIdError } from './CONSTANTS'
import { _updateContextMenu } from './_chrome'

/**
 * Observable of updated ContextMenuOptions
 */
export const updateContextMenuStream = new Subject<
  ContextMenuOptions
>()

export async function updateContextMenu(
  options: ContextMenuOptions,
): Promise<void> {
  /* ------------- VALIDATE OPTIONS ------------- */

  const { id, selector, ..._options } = options

  if (selector) {
    throw new TypeError('Cannot update context menu selector.')
  }

  if (!id) {
    throw new TypeError(noOptionsIdError)
  }

  /* -------------- GET OLD OPTIONS ------------- */

  const [oldOptions, subscription] = optionsMap.get(id) || [
    {},
    null,
  ]
  const newOptions = { ...oldOptions, ...options }

  /* ------------ UPDATE CONTEXT MENU ----------- */

  await _updateContextMenu(id, _options)

  /* ------------ UPDATE OPTIONS MAP ------------ */

  optionsMap.set(id, [newOptions, subscription])

  /* ----------- PUSH TO UPDATE STREAM ---------- */

  updateContextMenuStream.next(newOptions)
}
