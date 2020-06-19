import { delay } from './delay'
import { captureEvents } from './captureEvents'
import { ChromeEvent } from './types'
import { resolvePath } from './resolvePath'
import { eventPaths, importPath, delayLength } from './placeholders'

const events = eventPaths.map((eventPath) => resolvePath<ChromeEvent>(chrome, eventPath))
const triggerEvents = captureEvents(events)

import(importPath).then(async () => {
  if (delayLength) await delay(delayLength)

  triggerEvents()
})
