<script>
  import Logo from '@/assets/crx.svg'

  let show = $state(false)
</script>

<div class='popup-container'>
  <div
    class='popup-content'
    class:opacity-100={show}
    class:opacity-0={!show}
    style="display: {show ? 'block' : 'none'}"
  >
    <h1>HELLO CRXJS</h1>
  </div>
  <button
    class='toggle-button'
    onclick={() => show = !show}
  >
    <img src={Logo} alt='CRXJS logo' class='button-icon'>
  </button>
</div>

<style>
  .popup-container {
    position: fixed;
    right: 0;
    bottom: 0;
    margin: 1.25rem;
    z-index: 100;
    display: flex;
    align-items: flex-end;
    font-family: ui-sans-serif, system-ui, sans-serif;
    user-select: none;
    line-height: 1em;
  }

  .popup-content {
    background-color: white;
    color: #1f2937;
    border-radius: 0.5rem;
    box-shadow:
      0 4px 6px -1px rgb(0 0 0 / 0.1),
      0 2px 4px -2px rgb(0 0 0 / 0.1);
    width: max-content;
    height: min-content;
    padding: 0.5rem 1rem;
    margin: auto 0.5rem 0 0;
    transition: opacity 300ms;
  }

  .opacity-100 {
    opacity: 1;
  }

  .opacity-0 {
    opacity: 0;
  }

  .toggle-button {
    display: flex;
    justify-content: center;
    width: 2.5rem;
    height: 2.5rem;
    border-radius: 9999px;
    box-shadow:
      0 1px 3px 0 rgb(0 0 0 / 0.1),
      0 1px 2px -1px rgb(0 0 0 / 0.1);
    cursor: pointer;
    border: none;
    background-color: #288cd7;
  }

  .toggle-button:hover {
    background-color: #1e6aa3;
  }

  .button-icon {
    padding: 4px;
  }
</style>
