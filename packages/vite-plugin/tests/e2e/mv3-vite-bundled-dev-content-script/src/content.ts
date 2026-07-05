const container = document.createElement('div')

container.id = 'bundled-dev-content-script-test'
container.style.cssText = [
  'position: fixed',
  'top: 10px',
  'right: 10px',
  'z-index: 2147483647',
  'background: #ffffff',
  'color: #111111',
  'border: 2px solid #0d9488',
  'padding: 8px 10px',
  'font: 13px/1.3 sans-serif',
].join(';')
container.textContent = 'Vite bundled dev content script loaded'

document.body.appendChild(container)

export {}
