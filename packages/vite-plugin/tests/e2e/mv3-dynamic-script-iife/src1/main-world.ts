// This script runs in the MAIN world via registerContentScripts
console.log('main-world.ts running in MAIN world')

document.addEventListener('DOMContentLoaded', () => {
  const p = document.createElement('p')
  p.className = 'ok'
  p.innerText = 'src1'
  document.body.appendChild(p)
})

export {}
