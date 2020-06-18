import { getDeepMatches } from './getDeepMatches'
import { captureEvents } from './captureEvents'
import { ChromeEvent } from './types'
import { delay } from './delay'
import { importPath, delayLength } from './placeholders'

const events = getDeepMatches<ChromeEvent>(chrome, (x) => typeof x === 'object' && 'addListener' in x)
const triggerEvents = captureEvents(events)

import(importPath).then(async () => {
  if (delayLength) await delay(delayLength)

  triggerEvents()
})
