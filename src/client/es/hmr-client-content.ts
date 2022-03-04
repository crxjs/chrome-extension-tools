if (import.meta.hot) {
  import.meta.hot.on('crx:full-reload', () => {
    console.log('[crx] full reload')
    setTimeout(() => location.reload(), 500)
  })
}

export {}
