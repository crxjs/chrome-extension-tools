import crxLogo from '@/assets/crx.svg'
import solidLogo from '@/assets/solid.svg'
import viteLogo from '@/assets/vite.svg'
import HelloWorld from '@/components/HelloWorld'
import './App.css'

function App() {
  return (
    <div>
      <a href="https://vite.dev" target="_blank">
        <img src={viteLogo} class="logo" alt="Vite logo" />
      </a>
      <a href="https://solidjs.com" target="_blank">
        <img src={solidLogo} class="logo solid" alt="Solid logo" />
      </a>
      <a href="https://crxjs.dev/vite-plugin" target="_blank">
        <img src={crxLogo} class="logo crx" alt="crx logo" />
      </a>
      <HelloWorld msg="Vite + Solid + CRXJS" />
    </div>
  )
}

export default App
