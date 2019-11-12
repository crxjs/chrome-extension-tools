// TODO: refactor to TS

// Reloader paths are relative to the dist folder
// TODO: refactor to separate file to support mocking
const loadReloader = (reloader) => {
  if (typeof reloader === 'function') {
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

export default function useReloader({
  reloader = 'non-persistent',
} = {}) {
  if (!process.env.ROLLUP_WATCH || !reloader) {
    return {
      name: 'no-reloader',
      generateBundle() {},
      writeBundle() {},
    }
  }

  const _reloader = loadReloader(reloader)

  let startReloader = true
  let firstRun = true

  return {
    name: _reloader.name || 'reloader',

    // TODO: add buildStart hook
    //  - Signal that the build has started

    async generateBundle(options, bundle) {
      if (_reloader) {
        if (startReloader) {
          await _reloader.startReloader.call(
            this,
            options,
            bundle,
            (shouldStart) => {
              startReloader = shouldStart
            },
          )

          startReloader = false
        }

        // TODO: combine createClientFiles and updateManifest
        _reloader.createClientFiles.call(this, options, bundle)
        _reloader.updateManifest.call(this, options, bundle)
      }
    },

    writeBundle(bundle) {
      if (!_reloader) return

      // TODO: consider if this is the job of the reloader
      if (firstRun) {
        firstRun = false
        console.log(_reloader.name, 'ready...')
        return
      }

      return _reloader.reloadClients
        .call(this, bundle)
        .then(() => {
          console.log('Reload success...')
        })
        .catch((error) => {
          const message = `${error.message} (${error.code})`
          this.warn(message)
        })
    },
  }
}
