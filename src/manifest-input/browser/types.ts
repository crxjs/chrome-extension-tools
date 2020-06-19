export type ChromeEvent = chrome.events.Event<Function> & {
  __isCapturedEvent: boolean
}

export type LastError = chrome.runtime.LastError | undefined
