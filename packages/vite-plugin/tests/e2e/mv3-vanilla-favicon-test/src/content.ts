const getFaviconURL = (u: string) => {
  const url = new URL(chrome.runtime.getURL('/_favicon/'))
  url.searchParams.set('pageUrl', u) // this encodes the URL as well
  url.searchParams.set('size', '32')
  return url.toString()
}

// Create a container for test favicons
const faviconContainer = document.createElement('div')
faviconContainer.id = 'favicon-test-container'
faviconContainer.style.cssText =
  'position: fixed; top: 10px; right: 10px; z-index: 9999; background: white; padding: 10px; border: 1px solid #ccc;'

// Test GitHub favicon
const githubImg = document.createElement('img')
githubImg.src = getFaviconURL('https://github.com')
githubImg.alt = "GitHub's favicon"
githubImg.className = 'favicon-test-github'
githubImg.style.cssText = 'width: 32px; height: 32px; margin: 2px;'

// Add title
const title = document.createElement('div')
title.textContent = 'Content Script Favicons:'
title.style.cssText =
  'font-weight: bold; margin-bottom: 5px; font-family: Arial, sans-serif; font-size: 12px;'

faviconContainer.appendChild(title)
faviconContainer.appendChild(githubImg)

document.body.appendChild(faviconContainer)

console.log('Content script loaded with favicon tests')


export {}