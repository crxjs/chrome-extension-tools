import MagicString from 'magic-string'

const name = 'async-iife'

export default function asyncIIFE() {
  let active = false

  return {
    name,

    outputOptions({ format, ...options }) {
      if (format !== 'async-iife') return null

      active = true

      return {
        format: 'esm',
        ...options,
      }
    },

    renderChunk(source, chunk, { sourcemap }) {
      if (!(active && chunk.isEntry)) return null

      const code = [
        // import -> const
        c => c.replace(/^import/gm, 'const'),
        // as -> ':'
        c => c.replace(/(?<=\{.+)( as)(?=.+\})/g, ':'),
        // from -> '='
        c => c.replace(/ from /g, ' = '),
        // path -> 'await import(path)'
        c => c.replace(/('.+?');$/gm, 'await import($1);'),
      ].reduce((c, fn) => fn(c), source)

      const magic = new MagicString(code)

      magic
        .indent('  ')
        .prepend('(async () => {\n')
        .append('\n})();\n')

      return sourcemap
        ? {
            code: magic.toString(),
            map: magic.generateMap({
              source: chunk.fileName,
            }),
          }
        : { code: magic.toString() }
    },
  }
}
