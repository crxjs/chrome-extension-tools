import { getExtPath } from './utils'

export const srcDir = getExtPath('kitchen-sink')
export const manifestJson = getExtPath('kitchen-sink/manifest.json')
export const indexHtml = getExtPath('kitchen-sink/index.html')

// Icons
export const icon16 = getExtPath('kitchen-sink/images/icon-main-16.png')
export const icon48 = getExtPath('kitchen-sink/images/icon-main-48.png')
export const icon128 = getExtPath(
  'kitchen-sink/images/icon-main-128.png',
)
export const faviconIco = getExtPath(
  'kitchen-sink/images/favicon.ico',
)
export const faviconPng = getExtPath(
  'kitchen-sink/images/favicon.png',
)

// Fonts
export const notoSansBlack = getExtPath(
  'kitchen-sink/fonts/NotoSans-Black.ttf',
)
export const missaaliOtf = getExtPath(
  'kitchen-sink/fonts/Missaali-Regular.otf',
)
export const notoSansLight = getExtPath(
  'kitchen-sink/fonts/NotoSans-Light.ttf',
)

// Options assets
export const kitchenSinkRoot = getExtPath('kitchen-sink')
export const optionsHtml = getExtPath('kitchen-sink/options.html')
export const optionsCss = getExtPath('kitchen-sink/options.css')
export const optionsPng = getExtPath('kitchen-sink/options.png')
export const optionsJpg = getExtPath('kitchen-sink/options.jpg')
export const assetJs = getExtPath('kitchen-sink/asset.js')

// Options chunks
export const optionsJs = getExtPath('kitchen-sink/options1.js')
export const optionsJsx = getExtPath('kitchen-sink/options2.jsx')
export const optionsTs = getExtPath('kitchen-sink/options3.ts')
export const optionsTsx = getExtPath('kitchen-sink/options4.tsx')

// External script files
export const backgroundJs = getExtPath('kitchen-sink/background.js')
export const contentJs = getExtPath('kitchen-sink/content.js')

// Popup subfolder
export const popupHtml = getExtPath('kitchen-sink/popup/popup.html')
export const popupJs = getExtPath('kitchen-sink/popup/popup.js')

export const contentCss = getExtPath('kitchen-sink/content.css')

// Devtools subfolder
export const devtoolsHtml = getExtPath('kitchen-sink/devtools/devtools.html')
