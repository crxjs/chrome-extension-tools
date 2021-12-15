import {
  delay,
  filter,
  interval,
  map,
  merge,
  mergeMap,
  pairwise,
  retry,
  sample,
  scan,
  startWith,
  throttleTime,
} from 'rxjs'
import { fromFetch } from 'rxjs/fetch'
import { isNumber, isUndefined } from '../helpers'
import { Manifest } from '../types'
import {
  getDevWarning,
  sendReload,
  updateVersionStream,
} from './runtimeReloader_helpers'

console.log(getDevWarning())

const reloadStream = merge(
  updateVersionStream,
  interval(1000),
).pipe(
  throttleTime(1000),
  mergeMap(() => fromFetch('manifest.json')),
  mergeMap((r) => r.json()),
  retry(),
  filter((m): m is Manifest => !isUndefined(m)),
  map(({ version_name }) => version_name),
  pairwise(),
  filter(([prev, next]) => prev !== next),
)

updateVersionStream
  .pipe(
    startWith([undefined, { tab: { id: undefined } }] as const),
    scan(
      (tabIds, [, { tab = {} }]) =>
        isNumber(tab?.id) ? tabIds.add(tab.id) : tabIds,
      new Set<number>(),
    ),
    sample(reloadStream),
    map((set) => Array.from(set)),
    mergeMap((ids) =>
      Promise.all(
        ids.map((tabId) => sendReload(undefined, { tabId })),
      ),
    ),
    delay(100),
  )
  .subscribe(() => chrome.runtime.reload())
