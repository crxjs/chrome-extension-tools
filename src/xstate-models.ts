import { EmittedFile } from 'rollup'
import { EventFrom } from 'xstate'
import { createModel } from 'xstate/lib/model'

export const parsingEventCreators = {
  MANIFEST: (id: string) => ({ id }),
  CSS: (id: string, origin: string) => ({ id, origin }),
  HTML: (id: string, origin?: string) => ({ id, origin }),
  IMAGE: (id: string, origin: string) => ({ id, origin }),
  JSON: (id: string, origin: string) => ({ id, origin }),
  RAW: (id: string, origin: string) => ({ id, origin }),
  SCRIPT: (id: string, origin: string) => ({ id, origin }),
}

const parsingEventModel = createModel(
  {},
  { events: parsingEventCreators },
)
export type ParsingEvent = EventFrom<typeof parsingEventModel>
export type FileType = ParsingEvent['type']
export const fileTypes: FileType[] = [
  'CSS',
  'HTML',
  'IMAGE',
  'JSON',
  'MANIFEST',
  'RAW',
  'SCRIPT',
]

export const sharedEventCreators = {
  CHANGE: (
    id: string,
    change: { event: 'create' | 'update' | 'delete' },
  ) => ({
    id,
    ...change,
  }),
  ERROR: (error: Error) => ({ error }),
  READY: (file: EmittedFile) => ({ file }),
  START: () => ({}),
  ...parsingEventCreators,
}
