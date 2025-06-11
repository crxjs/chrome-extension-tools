<script lang='ts'>
  const { msg } = $props()
  let count = $state(0)
</script>

<h1>{msg}</h1>

<div class='card'>
  <button type='button' onclick={() => count++}>
    count is {count}
  </button>
  <p>
    Edit
    <code>src/components/HelloWorld.svelte</code> to test HMR
  </p>
</div>

<p>
  Check out
  <a href='https://github.com/crxjs/create-crxjs' target='_blank'>create-crxjs</a>, the official starter
</p>

<p class='read-the-docs'>
  Click on the Vite, Svelte and CRXJS logos to learn more
</p>

<style>
  .read-the-docs {
    color: #888;
  }
</style>
