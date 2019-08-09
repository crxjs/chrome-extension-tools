console.log('popup')

import chromep from 'chrome-promise'

// chrome support
chrome.declarativeContent.onPageChanged(() => {
  console.log('a page changed')
})

// chromep support
chromep.desktopCapture.chooseDesktopMedia()
