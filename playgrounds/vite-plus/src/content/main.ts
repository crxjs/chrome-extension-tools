import crxLogo from '../assets/crx.svg'

console.log('[CRXJS] Hello world from content script!')

const appHostId = 'crxjs-app'

document.getElementById(appHostId)?.remove()

const host = document.createElement('div')
host.id = appHostId
document.body.appendChild(host)

const root = host.attachShadow({ mode: 'open' })
root.innerHTML = `
  <style>
    .popup-container {
      position: fixed;
      right: 0;
      bottom: 0;
      z-index: 100;
      display: flex;
      align-items: flex-end;
      margin: 1.25rem;
      font-family: ui-sans-serif, system-ui, sans-serif;
      line-height: 1;
      user-select: none;
    }

    .popup-content {
      width: max-content;
      height: min-content;
      margin: auto 0.5rem 0 0;
      padding: 0.5rem 1rem;
      color: #1f2937;
      background-color: white;
      border-radius: 0.5rem;
      box-shadow:
        0 4px 6px -1px rgb(0 0 0 / 0.1),
        0 2px 4px -2px rgb(0 0 0 / 0.1);
    }

    .popup-content[hidden] {
      display: none;
    }

    .popup-content h1 {
      margin: 0;
      font-size: 2rem;
      font-weight: 700;
      line-height: 1.2;
    }

    .popup-content p {
      margin: 0.25rem 0 0;
      font-size: 0.875rem;
    }

    .toggle-button {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 2.5rem;
      height: 2.5rem;
      padding: 0;
      background-color: #288cd7;
      border: none;
      border-radius: 9999px;
      box-shadow:
        0 1px 3px 0 rgb(0 0 0 / 0.1),
        0 1px 2px -1px rgb(0 0 0 / 0.1);
      cursor: pointer;
    }

    .toggle-button:hover {
      background-color: #1e6aa3;
    }

    .button-icon {
      width: 2rem;
      height: 2rem;
      padding: 4px;
    }
  </style>
  <div class="popup-container">
    <div class="popup-content" hidden>
      <h1>HELLO CRXJS</h1>
      <p>Vite+ content script is running.</p>
    </div>
    <button class="toggle-button" type="button" aria-label="Toggle CRXJS content popup">
      <img src="${crxLogo}" alt="" class="button-icon" />
    </button>
  </div>
`

const button = root.querySelector<HTMLButtonElement>('.toggle-button')
const content = root.querySelector<HTMLElement>('.popup-content')

button?.addEventListener('click', () => {
  if (content) {
    content.hidden = !content.hidden
  }
})
