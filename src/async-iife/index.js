import MagicString from 'magic-string'
import { createFilter } from 'rollup-pluginutils'

const name = 'async-iife'

const regx = {
  importLine: /^import (.+) from ('.+?');$/gm,
  asg: /(?<=\{.+)( as )(?=.+?\})/g,
}

export default function asyncIIFE({
  include,
  exclude = ['**/*.esm.js'],
} = {}) {
  const filter = createFilter(include, exclude)

  return {
    name,

    renderChunk(
      source,
      { isEntry, facadeModuleId, fileName },
      { sourcemap },
    ) {
      if (!isEntry || !filter(facadeModuleId)) return null

      const code = source.replace(
        regx.importLine,
        (line, $1, $2) => {
          const asg = $1.replace(regx.asg, ': ')
          return `const ${asg} = await import(${$2});`
        },
      )

      const magic = new MagicString(code)

      magic
        .indent('  ')
        .prepend('(async () => {\n')
        .append('\n})();\n')

      return sourcemap
        ? {
            code: magic.toString(),
            map: magic.generateMap({
              source: fileName,
            }),
          }
        : { code: magic.toString() }
    },
  }
}
