<script setup>
defineProps({ msg: String })
</script>

<template>
  <h1>{{ msg }}</h1>
  <button id="crx-btn" type="button">click</button>
</template>

<style scoped>
.button,
#crx-btn {
  background-color: rgb(0, 128, 0);
  color: white;
  padding: 4px 8px;
  border: 1px solid black;
}
</style>
