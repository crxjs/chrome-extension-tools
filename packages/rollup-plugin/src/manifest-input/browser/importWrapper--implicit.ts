import { captureEvents } from './captureEvents'
import { delay } from './delay'
import { getDeepMatches } from './getDeepMatches'
import { delayLength, excludedPaths, importPath } from './placeholders'
import { ChromeEvent } from './types'

const events = getDeepMatches<ChromeEvent>(
  chrome,
  (x) => typeof x === 'object' && 'addListener' in x,
  // The webRequest API is not compatible with event pages
  //  TODO: this can be removed
  //   if we stop using this wrapper with "webRequest" permission
  excludedPaths.concat(['webRequest']),
)
const triggerEvents = captureEvents(events)

import(importPath).then(async () => {
  if (delayLength) await delay(delayLength)

  triggerEvents()
})
