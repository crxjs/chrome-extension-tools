import 'virtual:uno.css'

// Create a root element with UnoCSS classes
const root = document.createElement('div')
root.id = 'uno-test'
// Updated state: green background with additional classes
root.className = 'bg-green-500 text-white p-4 m-4 rounded font-bold'
root.textContent = 'UnoCSS Test - Updated'
document.body.appendChild(root)
