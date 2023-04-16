const root = document.createElement('div')
root.id = 'root'
root.addEventListener('click', () => {
  chrome.runtime.sendMessage('clicked')
})
document.body.append(root)

let injectCount = 0
export function run({ perf }: ContentScriptAPI.RunOptions) {
  injectCount++
  root.textContent = `injected ${injectCount}x`
  root.dataset.injected = injectCount.toString()
  root.dataset.injectTime = perf.injectTime.toString()
  root.dataset.loadTime = perf.loadTime.toString()
  console.log('content script ran')
}
