import { PluginHooks } from 'rollup'

export type ReloaderPlugin = Pick<
  PluginHooks,
  'buildStart' | 'generateBundle' | 'writeBundle'
> & { name: string }

export interface ReloaderPluginOptions {
  reloader: 'persistent' | 'non-persistent' | ReloaderPlugin
}

export function useReloader(
  { reloader = 'non-persistent' } = {} as ReloaderPluginOptions,
): ReloaderPlugin {
  if (!process.env.ROLLUP_WATCH || !reloader) {
    return {
      name: 'no-reloader',
      buildStart() {},
      generateBundle() {},
      writeBundle() {},
    }
  } else if (
    typeof reloader === 'object' &&
    typeof reloader.buildStart === 'function' &&
    typeof reloader.generateBundle === 'function' &&
    typeof reloader.writeBundle === 'function'
  ) {
    return reloader
  } else {
    throw new TypeError(
      'reloader type should be "persistent", "non-persistent", or a custom reloader',
    )
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
            (shouldStart: boolean) => {
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
        .catch((error: any) => {
          const message = `${error.message} (${error.code})`
          this.warn(message)
        })
    },
  }
}

export default useReloader
