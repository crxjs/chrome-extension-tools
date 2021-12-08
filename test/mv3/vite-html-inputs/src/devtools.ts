console.log('devtools.ts')
export {}

chrome.devtools.panels.create(
  'test',
  'icon-48.png',
  'test.html',
  (panel) => {
    console.log('panel created', panel)
  },
)
