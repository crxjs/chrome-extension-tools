import {
  Plugin,
  OutputBundle,
  OutputOptions,
  PluginContext,
  ModuleFormat,
} from 'rollup'
import { isChunk } from '../helpers'
import { ManifestInputPlugin } from '../plugin-options'
import { regenerateBundle } from './regenerateBundle'

export function mixedFormat(
  options: Pick<ManifestInputPlugin, 'formatMap'>,
): Pick<Required<Plugin>, 'name' | 'generateBundle'> {
  return {
    name: 'mixed-format',
    async generateBundle(
      this: PluginContext,
      { format }: OutputOptions,
      bundle: OutputBundle,
    ): Promise<void> {
      const { formatMap } = options // this might not be defined upon init

      if (typeof formatMap === 'undefined') return

      const formats = Object.entries(formatMap).filter(
        (
          x,
        ): x is [
          ModuleFormat,
          string[] | Record<string, string>,
        ] => typeof x[1] !== 'undefined',
      )

      {
        const allInput = formats.flatMap(([, inputs]) =>
          Array.isArray(inputs)
            ? inputs
            : Object.values(inputs || {}),
        )
        const allInputSet = new Set(allInput)
        if (allInput.length !== allInputSet.size) {
          throw new Error(
            'formats should not have duplicate inputs',
          )
        }
      }

      // TODO: handle different kinds of formats differently?
      const bundles = await Promise.all(
        // Configured formats
        formats.flatMap(([f, inputs]) =>
          (Array.isArray(inputs)
            ? inputs
            : Object.values(inputs)
          ).map((input) =>
            regenerateBundle.call(
              this,
              {
                input,
                output: {
                  format: f,
                },
              },
              bundle,
            ),
          ),
        ),
      )

      // Base format (ESM)
      const base = await regenerateBundle.call(
        this,
        {
          input: Object.entries(bundle)
            .filter(([, file]) => isChunk(file) && file.isEntry)
            .map(([key]) => key),
          output: { format },
        },
        bundle,
      )

      // Empty bundle
      Object.entries(bundle)
        .filter(([, v]) => isChunk(v))
        .forEach(([key]) => {
          delete bundle[key]
        })

      // Refill bundle
      Object.assign(bundle, base, ...bundles)
    },
  }
}
