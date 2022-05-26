export const onLoad = () => {
  chrome.runtime.openOptionsPage()
  console.log('opened options page')
}

export {}
