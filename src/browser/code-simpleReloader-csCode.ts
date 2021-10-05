import { delay, interval, mergeMap, retry } from 'rxjs'
import {
  devWarning,
  reloadStream,
  sendUpdateVersion,
} from './simpleReloader_helpers'

console.log(devWarning)

interval(1000)
  .pipe(
    mergeMap(() => sendUpdateVersion(undefined)),
    retry(),
  )
  .subscribe()

reloadStream.pipe(delay(200)).subscribe(() => location.reload())
