import path from 'path'
import {
  OutputBundle,
  Plugin,
  PluginContext,
  rollup,
  RollupOptions,
} from 'rollup'
import { resolveFromBundle } from './resolveFromBundle'

/** This is really fast b/c we don't use any plugins, and we use the previous bundle as the filesystem */
export async function regenerateBundle(
  this: PluginContext,
  { input, output }: RollupOptions,
  bundle: OutputBundle,
): Promise<OutputBundle> {
  if (!output || Array.isArray(output)) {
    throw new TypeError(
      'options.output must be an OutputOptions object',
    )
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

  let newBundle: OutputBundle
  await build.generate({
    ...output,
    plugins: [
      {
        name: 'get-bundle',
        generateBundle(o, b) {
          newBundle = b
        },
      } as Plugin,
    ],
  })

  return newBundle!
}
