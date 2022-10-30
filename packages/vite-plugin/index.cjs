Object.assign(module.exports, require('./dist/index.cjs'))

// async functions, can be redirect from ESM build
const asyncFunctions = ['crx', 'chromeExtension', 'allFilesReady', 'filesReady']
asyncFunctions.forEach((name) => {
  module.exports[name] = (...args) =>
    import('./dist/index.mjs').then((i) => i[name](...args))
})
