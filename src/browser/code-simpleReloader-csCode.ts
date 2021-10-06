import { format, log } from '$src/helpers'
import {
  catchError,
  delay,
  interval,
  mergeMap,
  retry,
} from 'rxjs'
import {
  devWarning,
  reloadStream,
  sendUpdateVersion,
} from './simpleReloader_helpers'

console.log(devWarning)

const { name } = chrome.runtime.getManifest()

interval(1000)
  .pipe(
    mergeMap(() => sendUpdateVersion(undefined)),
    catchError((err) => {
      if (err.message.includes('context invalidated'))
        console.error(err.message)
      else console.error(err)
      throw err
    }),
    retry(4),
  )
  .subscribe({
    error() {
      console.error(`Reload the page to reconnect to ${name}.`)
    },
  })

reloadStream.pipe(delay(200)).subscribe(() => location.reload())
