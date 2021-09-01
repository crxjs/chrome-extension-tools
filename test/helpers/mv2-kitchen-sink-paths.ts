import path from 'path'

export const srcDir = path.resolve(
  __dirname,
  '..',
  'mv2',
  'kitchen-sink',
)
export const manifestJson = path.join(srcDir, 'manifest.json')
export const indexHtml = path.join(srcDir, 'index.html')

// Icons
export const icon16 = path.join(
  srcDir,
  'images/icon-main-16.png',
)
export const icon48 = path.join(
  srcDir,
  'images/icon-main-48.png',
)
export const icon128 = path.join(
  srcDir,
  'images/icon-main-128.png',
)
export const faviconIco = path.join(srcDir, 'images/favicon.ico')
export const faviconPng = path.join(srcDir, 'images/favicon.png')

// Fonts
export const notoSansBlack = path.join(
  srcDir,
  'fonts/NotoSans-Black.ttf',
)
export const missaaliOtf = path.join(
  srcDir,
  'fonts/Missaali-Regular.otf',
)
export const notoSansLight = path.join(
  srcDir,
  'fonts/NotoSans-Light.ttf',
)

// Options assets
export const kitchenSinkRoot = path.join(srcDir)
export const optionsHtml = path.join(srcDir, 'options.html')
export const optionsCss = path.join(srcDir, 'options.css')
export const optionsPng = path.join(srcDir, 'options.png')
export const optionsJpg = path.join(srcDir, 'options.jpg')
export const assetJs = path.join(srcDir, 'asset.js')

// Options chunks
export const optionsJs = path.join(srcDir, 'options1.js')
export const optionsJsx = path.join(srcDir, 'options2.jsx')
export const optionsTs = path.join(srcDir, 'options3.ts')
export const optionsTsx = path.join(srcDir, 'options4.tsx')

// External script files
export const backgroundJs = path.join(srcDir, 'background.js')
export const contentJs = path.join(srcDir, 'content.js')

// Popup subfolder
export const popupHtml = path.join(srcDir, 'popup/popup.html')
export const popupJs = path.join(srcDir, 'popup/popup.js')

export const contentCss = path.join(srcDir, 'content.css')

// Devtools subfolder
export const devtoolsHtml = path.join(
  srcDir,
  'devtools/devtools.html',
)

// Locales subfolder
export const localesEnJson = path.join(
  srcDir,
  '_locales/en/messages.json',
)
export const localesEsJson = path.join(
  srcDir,
  '_locales/en/messages.json',
)

// Double underscore bug
export const _textFile = path.join(srcDir, '_war/test.txt')
