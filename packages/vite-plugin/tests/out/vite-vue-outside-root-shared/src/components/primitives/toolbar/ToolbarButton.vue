<script setup lang="ts">
defineProps<{ label: string }>()
</script>

<template>
  <button class="toolbar-button">{{ label }}</button>
</template>

<style scoped>
.toolbar-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
</style>
