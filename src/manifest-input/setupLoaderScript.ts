import { readFileSync } from 'fs'
import { join, relative } from 'path'
import slash from 'slash'

export function setupLoaderScript({
  eventDelay = false,
  wakeEvents = [] as string[],
}: {
  eventDelay?: number | false
  wakeEvents?: string[]
  noWakeEvents?: boolean
}) {
  // FEATURE: add static code analysis for wake events
  //  - Use code comments?
  //  - This will be slower...
  // WAKE_EVENT: chrome.runtime.onMessage

  const replaceDelay = (match: string, tag: string) => {
    if (typeof eventDelay === 'number') {
      return match.replace(tag, eventDelay.toString())
    } else if (eventDelay === false) {
      return ''
    } else {
      throw new TypeError(
        'dynamicImportEventDelay must be false or a number',
      )
    }
  }

  const replaceSwitchCase = (index: number) => {
    const events = wakeEvents.map((e) => e.split('.')[index])

    return (match: string, tag: string) => {
      return events.length
        ? events.map((e) => match.replace(tag, e)).join('')
        : ''
    }
  }

  // TODO: use bundleImports
  // TODO: convert dynamicImportWrapper to TS
  const script = readFileSync(
    join(__dirname, 'dynamicImportWrapper.js'),
    'utf-8',
  )

  return (scriptPath: string, events?: string[]) => {
    if (events) {
      wakeEvents = events
    }

    return script
      .replace(
        /[\n\s]+.then\(delay\(('%DELAY%')\)\)([\n\s]+)/,
        replaceDelay,
      )
      .replace(
        /[\n\s]+case '(%NAME%)':[\n\s]+return true/,
        replaceSwitchCase(1),
      )
      .replace(
        /[\n\s]+case '(%EVENT%)':[\n\s]+return true/,
        replaceSwitchCase(2),
      )
      .replace('%PATH%', slash(relative('assets', scriptPath)))
  }
}
