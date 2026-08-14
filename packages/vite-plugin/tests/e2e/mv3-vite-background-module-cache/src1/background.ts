import { getProgressMessage } from './progress'

export function getBackgroundMarker() {
  return 'background entry'
}

chrome.runtime.onMessage.addListener((message, sender) => {
  if (message?.type !== 'start-progress' || !sender.tab?.id) return

  chrome.tabs.sendMessage(sender.tab.id, {
    type: 'progress',
    message: getProgressMessage(),
  })
})

export {}
