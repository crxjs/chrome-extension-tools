/* eslint-disable @typescript-eslint/no-unsafe-function-type */
export type ChromeEvent = chrome.events.Event<Function> & {
  __isCapturedEvent: boolean
}

export type LastError = chrome.runtime.LastError | undefined
