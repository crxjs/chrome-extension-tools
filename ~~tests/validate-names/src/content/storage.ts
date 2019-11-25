import { storage } from '@bumble/storage'
import { concat, from } from 'rxjs'
import {
  distinctUntilChanged,
  filter,
  map,
  mergeMap,
  debounceTime,
} from 'rxjs/operators'
import * as state from '../state'

const getState = (): Promise<state.State> =>
  storage.local.get(state.initialState)

// TODO: create valueStream
/**
 * valueStream
 *
 * fires at subscription and every time onChanged fires
 */
const initialValueStream = from(getState())

const changedValueStream = storage.local.change$.pipe(
  mergeMap(getState),
)

const itemsStream = concat(
  initialValueStream,
  changedValueStream,
).pipe(map(({ items }) => Object.values(items)))

export const getItemsStream = (t: string) =>
  itemsStream.pipe(
    map((items) => items.filter(({ type }) => type === t)),
    // SMELL: is this necessary?
    debounceTime(250),
    distinctUntilChanged(
      // emits on false
      (a, b) => JSON.stringify(a) === JSON.stringify(b),
    ),
  )

export const textItemsStream = getItemsStream('text')
export const linkItemsStream = getItemsStream('link')
export const imageItemsStream = getItemsStream('image')

export const clearItemsStream = itemsStream.pipe(
  filter((items) => items.length === 0),
)
