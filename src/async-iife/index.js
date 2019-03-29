import MagicString from 'magic-string'

const name = 'async-iife'

const regx = {
  importLine: /^import (.+) from ('.+?');$/gm,
  asg: /(?<=\{.+)( as )(?=.+?\})/g,
}

export default function asyncIIFE() {
  return {
    name,

    renderChunk(source, chunk, { sourcemap }) {
      if (!chunk.isEntry) return null

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
              source: chunk.fileName,
            }),
          }
        : { code: magic.toString() }
    },
  }
}
