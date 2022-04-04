import icon from './image.png'
import font from './font.otf'
import scriptUrl from './script?script'

console.log('content.ts', { icon, font })

const script = document.createElement('script')
script.src = chrome.runtime.getURL(scriptUrl)
script.type = 'module'
document.body.append(script)
