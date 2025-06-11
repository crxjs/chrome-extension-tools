import crxLogo from '@/assets/crx.svg'
import tsLogo from '@/assets/ts.svg'
import viteLogo from '@/assets/vite.svg'
import { setupCounter } from './counter.ts'
import './style.css'

document.querySelector('#app')!.innerHTML = `
  <div>
    <a href="https://vite.dev" target="_blank">
      <img src="${viteLogo}" class="logo" alt="Vite logo" />
    </a>
    <a href="https://www.typescriptlang.org/" target="_blank">
      <img src="${tsLogo}" class="logo vanilla" alt="TypeScript logo" />
    </a>
    <a href="https://crxjs.dev/vite-plugin" target="_blank">
      <img src="${crxLogo}" class="logo crx" alt="CRXJS logo" />
    </a>
    <h1>Hello CRXJS!</h1>
    <div class="card">
      <button id="counter" type="button"></button>
    </div>
    <p class="read-the-docs">
      Click on the CRXJS logo to learn more
    </p>
  </div>
`

setupCounter(document.querySelector('#counter')!)
