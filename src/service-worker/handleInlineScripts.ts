import {
  count,
  filter,
  first,
  firstValueFrom,
  mapTo,
  Observable,
  shareReplay,
} from 'rxjs'

export const portName = '__inline_script_done'

export interface InlineScriptDoneMessage {
  type: 'inline_script_done'
  id: string
}

const inlineScriptDone$ =
  new Observable<InlineScriptDoneMessage>((sub) => {
    const port = chrome.runtime.connect({ name: portName })
    port.onMessage.addListener(
      (message) =>
        message.type === 'inline_script_done' &&
        sub.next(message),
    )
    return () => port.disconnect()
  }).pipe(shareReplay())

const countMap = new Map<string, number>()
/**
 * Registers a request for an inline script that was converted to a remote script
 */
export const registerInlineScript = (pageId: string): void => {
  const count = countMap.get(pageId) ?? 0
  countMap.set(pageId, count + 1)
}

/**
 * Resolves when the number of completed inline scripts
 * equals the number of registered inline scripts
 */
export const waitForInlineScripts = (
  pageId: string,
): Promise<void> => {
  return firstValueFrom(
    inlineScriptDone$.pipe(
      filter(({ id }) => id === pageId),
      // TODO: switch to skipWhile
      count(),
      first((count) => {
        const totalCount = countMap.get(pageId) ?? 0
        return count >= totalCount
      }),
      mapTo(undefined),
    ),
  )
}
