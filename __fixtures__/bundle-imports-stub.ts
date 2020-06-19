// IDEA: could use Rollup API to bundle this file
//  - that would probably be overkill

export const code = `

// BUNDLE IMPORTS STUB

const eventPaths = /*@__PURE__*/JSON.parse('%EVENTS%') as string[]
const importPath = /*@__PURE__*/JSON.parse('%PATH%') as string
const delayLength = /*@__PURE__*/JSON.parse('%DELAY%') as number
const excludedPaths = /*@__PURE__*/JSON.parse('%EXCLUDE%') as string[]

const events = eventPaths.map((eventPath) => resolvePath<ChromeEvent>(chrome, eventPath))
const triggerEvents = captureEvents(events)

import(importPath).then(async () => {
  if (delayLength) await delay(delayLength)

  triggerEvents()
})

`.trim()
