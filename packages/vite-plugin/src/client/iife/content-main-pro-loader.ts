declare const __SCRIPT__: string

(function () {
  const extendId = localStorage.getItem('__CRX_EXTEND_ID__');
  const path = `chrome-extension://${extendId}/`
  import(path + __SCRIPT__)
})()
