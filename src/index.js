import { watch } from 'rollup'

function watchAsync(config, cb) {
  const watcher = watch(config)
  const resolves = {
    START: [],
    BUNDLE_START: [],
    BUNDLE_END: [],
    END: [],
    FATAL: [],
    ERROR: [],
  }
  const rejects = []

  const eventHandler = event => {
    const tuple = { value: event, done: event.code === 'FATAL' }

    resolves[event.code].forEach(fn => fn(tuple))
    resolves[event.code] = []

    if (tuple.done) {
      rejects.forEach(fn => fn(event))
      watcher.close()
    }
  }

  if (cb) watcher.on('event', cb)
  watcher.on('event', eventHandler)

  watcher.next = code =>
    new Promise((resolve, reject) => {
      resolves[code].push(resolve)
      rejects.push(reject)
    })
  return watcher
}

export { watchAsync }
