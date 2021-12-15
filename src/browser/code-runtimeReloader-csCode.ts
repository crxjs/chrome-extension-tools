import { delay, interval, mergeMap, retry } from 'rxjs'
import {
  getDevWarning,
  reloadStream,
  sendUpdateVersion,
} from './runtimeReloader_helpers'

console.log(getDevWarning())

const { name } = chrome.runtime.getManifest()

interval(1000)
  .pipe(
    mergeMap(() => sendUpdateVersion(undefined)),
    retry(4),
  )
  .subscribe({
    error(err) {
      if (err.message.includes('context invalidated'))
        console.log(`Reload the page to reconnect to ${name}.`)
      else console.error(err)
    },
  })

reloadStream.pipe(delay(200)).subscribe(() => location.reload())
