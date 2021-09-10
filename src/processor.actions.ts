import { from } from 'rxjs'
import { isUndefined } from './helpers'
import { narrowEvent } from './helpers-xstate'
import {
  ProcessorContext,
  ProcessorEvent,
  ProcessorId,
  processorModel as model,
} from './processor.model'

export function processorAction(type: 'pre' | 'post') {
  return (
    { plugins }: ProcessorContext,
    event: ProcessorEvent,
  ) =>
    from(
      (async () => {
        try {
          const { file } = narrowEvent(event, 'ASSET')
          const id = file.processorId as Exclude<
            ProcessorId,
            'manifest'
          >

          let { source } = file
          if (isUndefined(source))
            throw new TypeError(
              `source is undefined (AssetFile:${file.id})`,
            )

          for (const p of plugins) {
            source =
              (await p[`${type}RPCE` as const]?.[id]?.(
                file.id,
                // @ts-expect-error this param is an intersection, but it should be a union
                source,
              )) ?? source
          }

          return model.events.ASSET({
            ...file,
            source,
            processedAt: new Date(),
          })
        } catch (error) {
          return model.events.ERROR(error)
        }
      })(),
    )
}
