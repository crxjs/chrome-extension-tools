{
  // eslint-disable-next-line quotes
  const loadMessage = `%LOAD_MESSAGE%`

  // Log load message to browser dev console
  console.log(loadMessage)

  const { name } = chrome.runtime.getManifest()

  const reload = () => {
    console.log(`${name} has reloaded...`)

    setTimeout(() => {
      location.reload()
    }, 500)
  }

  setInterval(() => {
    try {
      chrome.runtime.getManifest()
    } catch (error) {
      if (error.message === 'Extension context invalidated.') {
        reload()
      }
    }
  }, 1000)
}
