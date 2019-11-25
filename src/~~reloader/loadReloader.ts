// Reloader paths are relative to the dist folder
// TODO: refactor to separate file to support mocking
export const loadReloader = (reloader: any) => {
  if (
    typeof reloader === 'object' &&
    typeof reloader.buildStart === 'function' &&
    typeof reloader.generateBundle === 'function' &&
    typeof reloader.writeBundle === 'function'
  ) {
    return reloader()
  } else if (reloader === 'non-persistent') {
    return require('rpce-push-reloader').reloader()
  } else if (reloader === 'persistent') {
    return require('rpce-interval-reloader').reloader()
  } else {
    throw new TypeError(
      'reloader type should be "persistent", "non-persistent", or a custom reloader',
    )
  }
}
