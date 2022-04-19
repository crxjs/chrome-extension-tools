import { code as explicitScript } from 'code ./browser/importWrapper--explicit.ts'
import { code as implicitScript } from 'code ./browser/importWrapper--implicit.ts'

/**
 * This options object allows fine-tuning of the dynamic import wrapper.
 *
 * @export
 * @interface DynamicImportWrapper
 */
export interface DynamicImportWrapperOptions {
  /** How long to delay wake events after dynamic import has completed */
  eventDelay?: number
  /** Limit which wake events to capture. Use if the default event discovery is too slow. */
  wakeEvents?: string[]
  /** API namespaces to exclude from automatic detection */
  excludeNames?: string[]
}

// FEATURE: add static code analysis for wake events
//  - This will be slower...
export function prepImportWrapperScript({
  eventDelay = 0,
  wakeEvents = [],
  excludeNames = ['extension'],
}: DynamicImportWrapperOptions) {
  const delay = JSON.stringify(eventDelay)
  const events = wakeEvents.length
    ? JSON.stringify(wakeEvents.map((ev) => ev.replace(/^chrome\./, '')))
    : false
  const exclude = JSON.stringify(excludeNames)

  const script = (
    events
      ? explicitScript.replace('%EVENTS%', events)
      : implicitScript.replace('%EXCLUDE%', exclude)
  ).replace('%DELAY%', delay)

  return script
}
