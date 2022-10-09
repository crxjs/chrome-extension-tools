import { OutputChunk } from 'rollup'
import { ManifestChunk } from 'vite'
import { contentScripts } from './contentScripts'

interface FileResources {
  assets: Set<string>
  css: Set<string>
  imports: Set<string>
}

export function compileFileResources(
  fileName: string,
  {
    chunks,
    files,
  }: { chunks: Map<string, OutputChunk>; files: Map<string, ManifestChunk> },
  resources: FileResources = {
    assets: new Set(),
    css: new Set(),
    imports: new Set(),
  },
): FileResources {
  const chunk = chunks.get(fileName)
  if (chunk) {
    const { modules, facadeModuleId } = chunk
    for (const m of Object.keys(modules))
      if (m !== facadeModuleId) {
        const script = contentScripts.get(m)
        if (script)
          if (typeof script.fileName === 'undefined') {
            throw new Error(`Content script fileName for ${m} is undefined`)
          } else {
            resources.imports.add(script.fileName)
            compileFileResources(script.fileName, { chunks, files }, resources)
          }
      }
  }
  const file = files.get(fileName)
  if (file) {
    const { assets = [], css = [], imports = [], dynamicImports = [] } = file
    for (const x of assets) resources.assets.add(x)
    for (const x of css) resources.css.add(x)
    for (const x of imports) resources.imports.add(x)
    for (const x of dynamicImports) resources.imports.add(x)
    for (const x of [...imports, ...dynamicImports])
      compileFileResources(x, { chunks, files }, resources)
  }
  return resources
}
