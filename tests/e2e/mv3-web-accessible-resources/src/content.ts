import font from './font.otf'
import image from './image.png'

console.log('content.ts')

const container = document.createElement('div')
container.classList.add('container')

const tags = document.createElement('div')
tags.classList.add('tags')
container.append(tags)

const fontFace = new FontFace(
  'Some Font',
  `url(${chrome.runtime.getURL(font)})`,
)

fontFace
  .load()
  .then(() => {
    tags.classList.add('font')
  })
  .catch(console.error)

const img = document.createElement('img')
img.src = chrome.runtime.getURL(image)
img.addEventListener('load', function () {
  tags.classList.add('image')
})

const script = document.createElement('script')
script.src = chrome.runtime.getURL('src/script.ts')
container.append(script)

document.body.append(container)

export {}
