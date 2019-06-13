const loadReloader = (reloader) => {
  if (typeof reloader === 'function') {
    return reloader()
  } else if (reloader === 'non-persistent') {
    return require('../reloader/push').reloader()
  } else if (reloader === 'persistent') {
    return require('../reloader/interval').reloader()
  } else if (reloader === 'socket') {
    return require('../reloader/socket').reloader()
  } else {
    throw new TypeError(
      'reloader type should be "persistent", "non-persistent", or a custom reloader',
    )
  }
}

export default function useReloader({
  reloader = 'non-persistent',
} = {}) {
  if (!process.env.ROLLUP_WATCH || !reloader)
    return {
      name: 'no-reloader',
      generateBundle() {},
      writeBundle() {},
    }

  const _reloader = loadReloader(reloader)

  let startReloader = true
  let firstRun = true

  return {
    name: _reloader.name || 'reloader',

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

        _reloader.createClientFiles.call(this, options, bundle)
        _reloader.updateManifest.call(this, options, bundle)
      }
    },

    writeBundle(bundle) {
      if (_reloader) {
        if (!firstRun) {
          return _reloader.reloadClients
            .call(this, bundle)
            .then(() => {
              console.log('Reload success...')
            })
            .catch((error) => {
              const message = `${error.message} (${error.code})`
              this.warn(message)
            })
        } else {
          firstRun = false
          console.log(_reloader.name, 'ready...')
        }
      }
    },
  }
}
