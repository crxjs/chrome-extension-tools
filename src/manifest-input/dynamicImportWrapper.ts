import { code as explicitScript } from 'code ./browser/explicitImportWrapper.ts'
import { code as implicitScript } from 'code ./browser/implicitImportWrapper.ts'

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
}

// FEATURE: add static code analysis for wake events
//  - This will be slower...
export function prepImportWrapperScript({
  eventDelay = 0,
  wakeEvents = [],
}: DynamicImportWrapperOptions) {
  const delay = JSON.stringify(eventDelay)
  const events = wakeEvents.length
    ? JSON.stringify(
        wakeEvents.map((ev) => ev.replace(/^chrome\./, '')),
      )
    : false

  const script = (events
    ? explicitScript.replace('%EVENTS%', events)
    : implicitScript
  ).replace('%DELAY%', delay)

  return script
}
