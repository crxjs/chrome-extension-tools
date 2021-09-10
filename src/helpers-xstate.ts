import { EventObject, ExtractEvent } from 'xstate'

export function narrowEvent<
  TEvent extends EventObject,
  TEventType extends TEvent['type'],
>(
  event: TEvent,
  type: TEventType,
): ExtractEvent<TEvent, TEventType>
export function narrowEvent<
  TEvent extends EventObject,
  TEventType extends TEvent['type'],
>(
  event: TEvent,
  type: TEventType[],
): ExtractEvent<TEvent, TEventType>
export function narrowEvent<TEvent extends EventObject>(
  event: TEvent,
  types: string | string[],
): EventObject {
  types = Array.isArray(types) ? types : [types]
  if (!types.includes(event.type)) {
    throw new Error(
      `Expected event${
        types.length > 1 ? 's' : ''
      } "${types.join(', ')}" but got "${event.type}".`,
    )
  }

  return event
}
