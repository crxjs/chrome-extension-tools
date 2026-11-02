const url = new URL(chrome.runtime.getURL('/_favicon/'))
url.searchParams.set('pageUrl', 'https://example.com')
url.searchParams.set('size', '32')

const img = document.createElement('img')
img.id = 'favicon'
img.src = url.href
document.body.appendChild(img)

export {}
