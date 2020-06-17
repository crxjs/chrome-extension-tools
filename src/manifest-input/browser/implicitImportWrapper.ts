import { getDeepKeyMatches } from './getDeepKeyMatches'
import { captureEvents } from './captureEvents'
import { ChromeEvent } from './types'
import { delay } from './delay'

const events = getDeepKeyMatches<ChromeEvent>(chrome, (x) => typeof x === 'object' && 'addListener' in x)
const triggerEvents = captureEvents(events)

import('%PATH%')
  .then(delay('%DELAY%'))
  .then(triggerEvents)
