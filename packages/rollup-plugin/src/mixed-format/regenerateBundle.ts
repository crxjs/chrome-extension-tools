import path from 'path'
import { OutputChunk } from 'rollup'
import { RollupOptions } from 'rollup'
import { Plugin, OutputBundle, PluginContext, rollup } from 'rollup'
import { resolveFromBundle } from './resolveFromBundle'

export async function regenerateBundle(
  this: PluginContext,
  { input, output }: RollupOptions,
  bundle: OutputBundle,
): Promise<OutputBundle> {
  if (!output || Array.isArray(output)) {
    throw new TypeError('options.output must be an OutputOptions object')
  }

  if (typeof input === 'undefined') {
    throw new TypeError(
      'options.input should be an object, string array or string',
    )
  }

  // Don't do anything if input is an empty array
  if (Array.isArray(input) && input.length === 0) {
    return {}
  }

  const { format, chunkFileNames: cfn = '', sourcemap } = output

  const chunkFileNames = path.join(path.dirname(cfn), '[name].js')

  // Transform input array to input object
  const inputValue = Array.isArray(input)
    ? input.reduce((r, x) => {
        const { dir, name } = path.parse(x)
        return { ...r, [path.join(dir, name)]: x }
      }, {} as Record<string, string>)
    : input

  const build = await rollup({
    input: inputValue,
    plugins: [resolveFromBundle(bundle)],
  })

  let _b: OutputBundle
  await build.generate({
    format,
    sourcemap,
    chunkFileNames,
    plugins: [
      {
        name: 'get-bundle',
        generateBundle(o, b) {
          _b = b
        },
      } as Plugin,
    ],
  })
  const newBundle = _b!

  if (typeof inputValue === 'string') {
    delete bundle[inputValue]

    const bundleKey = path.basename(inputValue)

    return {
      [inputValue]: {
        ...(newBundle[bundleKey] as OutputChunk),
        fileName: inputValue,
      },
    }
  } else {
    // Remove regenerated entries from bundle
    Object.values(inputValue).forEach((key) => {
      delete bundle[key]
    })

    return newBundle
  }
}
