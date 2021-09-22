/* eslint-disable @typescript-eslint/ban-types */
export type ChromeEvent = chrome.events.Event<Function> & {
  __isCapturedEvent: boolean
}

export type LastError = chrome.runtime.LastError | undefined
