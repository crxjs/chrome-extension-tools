<script lang='ts'>
  import CrxLogo from '@/assets/crx.svg'
  import svelteLogo from '@/assets/svelte.svg'
  import viteLogo from '@/assets/vite.svg'
  import HelloWorld from '@/components/HelloWorld.svelte'
</script>

<div>
  <a href='https://vite.dev' target='_blank'>
    <img src={viteLogo} class='logo' alt='Vite logo'>
  </a>
  <a href='https://svelte.dev' target='_blank'>
    <img src={svelteLogo} class='logo svelte' alt='Svelte logo'>
  </a>
  <a href='https://crxjs.dev/vite-plugin' target='_blank'>
    <img src={CrxLogo} class='logo crx' alt='crx logo'>
  </a>
</div>
<HelloWorld msg='Vite + Svelte + CRXJS' />

<style>
  .logo {
    height: 6em;
    padding: 1.5em;
    will-change: filter;
    transition: filter 300ms;
  }
  .logo:hover {
    filter: drop-shadow(0 0 2em #646cffaa);
  }
  .logo.svelte:hover {
    filter: drop-shadow(0 0 2em #ff3e00aa);
  }
  .logo.crx:hover {
    filter: drop-shadow(0 0 2em #f2bae4aa);
  }
</style>
