import { getExtPath } from './utils'

export const crxName = 'mv3-kitchen-sink'
export const srcDir = getExtPath(crxName)
export const manifestJson = getExtPath(crxName, 'manifest.json')
export const indexHtml = getExtPath(crxName, 'index.html')

// Icons
export const icon16 = getExtPath(crxName, 'images/icon-main-16.png')
export const icon48 = getExtPath(crxName, 'images/icon-main-48.png')
export const icon128 = getExtPath(crxName, 'images/icon-main-128.png')
export const faviconIco = getExtPath(crxName, 'images/favicon.ico')
export const faviconPng = getExtPath(crxName, 'images/favicon.png')

// Fonts
export const notoSansBlack = getExtPath(crxName, 'fonts/NotoSans-Black.ttf')
export const missaaliOtf = getExtPath(crxName, 'fonts/Missaali-Regular.otf')
export const notoSansLight = getExtPath(crxName, 'fonts/NotoSans-Light.ttf')

// Options assets
export const kitchenSinkRoot = getExtPath(crxName)
export const optionsHtml = getExtPath(crxName, 'options.html')
export const optionsCss = getExtPath(crxName, 'options.css')
export const optionsPng = getExtPath(crxName, 'options.png')
export const optionsJpg = getExtPath(crxName, 'options.jpg')
export const assetJs = getExtPath(crxName, 'asset.js')

// Options chunks
export const optionsJs = getExtPath(crxName, 'options1.js')
export const optionsJsx = getExtPath(crxName, 'options2.jsx')
export const optionsTs = getExtPath(crxName, 'options3.ts')
export const optionsTsx = getExtPath(crxName, 'options4.tsx')

// External script files
export const serviceWorkerJs = getExtPath(crxName, 'service_worker.js')
export const contentJs = getExtPath(crxName, 'content.js')

// Popup subfolder
export const popupHtml = getExtPath(crxName, 'popup/popup.html')
export const popupJs = getExtPath(crxName, 'popup/popup.js')

export const contentCss = getExtPath(crxName, 'content.css')

// Devtools subfolder
export const devtoolsHtml = getExtPath(crxName, 'devtools/devtools.html')

// Locales subfolder
export const localesEnJson = getExtPath(crxName, '_locales/en/messages.json')
export const localesEsJson = getExtPath(crxName, '_locales/en/messages.json')
