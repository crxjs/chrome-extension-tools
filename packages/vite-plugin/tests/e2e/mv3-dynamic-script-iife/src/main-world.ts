// This script runs in the MAIN world via registerContentScripts
console.log('main-world.ts running in MAIN world')

function createOkElement() {
  const p = document.createElement('p')
  p.className = 'ok'
  p.innerText = 'ok'
  document.body.appendChild(p)
}

document.addEventListener('DOMContentLoaded', createOkElement)

export {}
