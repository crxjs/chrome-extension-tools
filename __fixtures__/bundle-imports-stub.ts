// IDEA: could use Rollup API to bundle this file
//  - that would probably be overkill

export const code = `

// BUNDLE IMPORTS STUB

const eventPaths = JSON.parse('%EVENTS%') as string[]
const importPath = JSON.parse('%PATH%') as string
const delayLength = JSON.parse('%DELAY%') as number

const events = eventPaths.map((eventPath) => resolvePath<ChromeEvent>(chrome, eventPath))
const triggerEvents = captureEvents(events)

import(importPath).then(async () => {
  if (delayLength) await delay(delayLength)

  triggerEvents()
})

`.trim()
