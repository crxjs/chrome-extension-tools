import { Subscription } from 'rxjs'

/**
 * Map of basic context menu ids to selector context menu id arrays
 */
export const optionsMap = new Map<
  string,
  [ContextMenuOptions, Subscription | null]
>()
