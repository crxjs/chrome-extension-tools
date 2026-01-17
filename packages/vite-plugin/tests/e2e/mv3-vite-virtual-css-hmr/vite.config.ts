import { crx } from '../../plugin-testOptionsProvider'
import { defineConfig, Plugin } from 'vite'
import manifest from './manifest.json'

/**
 * Simplified UnoCSS-like plugin that generates virtual CSS The CSS content
 * changes based on what classes are used in the source files
 */
function virtualCssPlugin(): Plugin {
  const virtualModuleId = 'virtual:uno.css'
  const resolvedVirtualModuleId = '\0' + virtualModuleId

  // Simulated atomic CSS - content changes based on "usage"
  let cssContent = `
/* Virtual CSS - initial */
.text-red { color: red; }
.bg-blue { background-color: blue; }
`

  return {
    name: 'virtual-css-plugin',
    resolveId(id) {
      if (id === virtualModuleId) {
        return resolvedVirtualModuleId
      }
    },
    load(id) {
      if (id === resolvedVirtualModuleId) {
        return cssContent
      }
    },
    // Update CSS content when files change (simulating UnoCSS scanning)
    handleHotUpdate({ file, server }) {
      if (file.endsWith('.ts') && !file.includes('background')) {
        // Simulate UnoCSS regenerating CSS based on new utility classes
        cssContent = `
/* Virtual CSS - updated at ${Date.now()} */
.text-red { color: red; }
.bg-blue { background-color: blue; }
.text-green { color: green; }
.mt-4 { margin-top: 1rem; }
`
        // Invalidate the virtual module
        const mod = server.moduleGraph.getModuleById(resolvedVirtualModuleId)
        if (mod) {
          server.moduleGraph.invalidateModule(mod)
          return [mod]
        }
      }
    },
  }
}

export default defineConfig({
  build: { minify: false },
  clearScreen: false,
  logLevel: 'error',
  plugins: [virtualCssPlugin(), crx({ manifest })],
})
