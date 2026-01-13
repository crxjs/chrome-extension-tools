// @ts-nocheck - UnoCSS types are not available in this test environment
import { defineConfig, presetUno } from 'unocss'

export default defineConfig({
  presets: [presetUno()],
  // Include TypeScript files in the extraction pipeline
  content: {
    pipeline: {
      include: [/\.(vue|svelte|[jt]sx?|mdx?|astro|elm|php|phtml|html)($|\?)/],
    },
  },
})
