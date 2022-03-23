import icon from './image.png'
import font from './font.otf'

console.log('content.ts', { icon, font })
fetch(chrome.runtime.getURL('src/script.ts')).catch(console.error)
