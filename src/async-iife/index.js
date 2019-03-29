import MagicString from 'magic-string'

const name = 'async-iife'

export default function asyncIIFE() {
  return {
    name,

    renderChunk(source, chunk, { sourcemap }) {
      if (!chunk.isEntry) return null

      const code = [
        // import -> const
        c => c.replace(/^import/gm, 'const'),
        // named imports to destructuring assignment
        c => c.replace(/( as )(?=.+?\} from .+?$)/gm, ': '),
        // 'path' -> 'await import(path)'
        c =>
          c.replace(/ from ('.+?');$/gm, ' = await import($1);'),
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
