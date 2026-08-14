let count = 0

const app = document.createElement('div')
app.id = 'app'
app.dataset.count = String(count)
app.textContent = `progress: ${count}`
document.body.append(app)

chrome.runtime.onMessage.addListener((message) => {
  if (message?.type !== 'progress') return

  count++
  app.dataset.count = String(count)
  app.textContent = `progress: ${count}`
})

chrome.runtime.sendMessage({ type: 'start-progress' })

export {}
