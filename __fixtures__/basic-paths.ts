import { getExtPath } from './utils'

export const srcDir = getExtPath('basic')
export const manifestJson = getExtPath('basic/manifest.json')

// Icons
export const icon16 = getExtPath('basic/images/icon-main-16.png')
export const icon48 = getExtPath('basic/images/icon-main-48.png')
export const icon128 = getExtPath(
  'basic/images/icon-main-128.png',
)
export const faviconIco = getExtPath(
  'basic/images/favicon.ico',
)
export const faviconPng = getExtPath(
  'basic/images/favicon.png',
)

// Fonts
export const notoSansBlack = getExtPath(
  'basic/fonts/NotoSans-Black.ttf',
)
export const missaaliOtf = getExtPath(
  'basic/fonts/Missaali-Regular.otf',
)
export const notoSansLight = getExtPath(
  'basic/fonts/NotoSans-Light.ttf',
)

// Options assets
export const optionsHtml = getExtPath('basic/options.html')
export const optionsCss = getExtPath('basic/options.css')
export const optionsPng = getExtPath('basic/options.png')
export const optionsJpg = getExtPath('basic/options.jpg')
export const assetJs = getExtPath('basic/asset.js')

// Options chunks
export const optionsJs = getExtPath('basic/options1.js')
export const optionsJsx = getExtPath('basic/options2.jsx')
export const optionsTs = getExtPath('basic/options3.ts')
export const optionsTsx = getExtPath('basic/options4.tsx')

// External script files
export const backgroundJs = getExtPath('basic/background.js')
export const contentJs = getExtPath('basic/content.js')

// Popup subfolder
export const popupHtml = getExtPath('basic/popup/popup.html')
export const popupJs = getExtPath('basic/popup/popup.js')

export const contentCss = getExtPath('basic/content.css')
