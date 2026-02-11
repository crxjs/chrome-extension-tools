import 'virtual:uno.css'

// Create a root element with UnoCSS classes
const root = document.createElement('div')
root.id = 'uno-test'
// Initial state: red background
root.className = 'bg-red-500 text-white p-4 m-4 rounded'
root.textContent = 'UnoCSS Test - Initial'
document.body.appendChild(root)
