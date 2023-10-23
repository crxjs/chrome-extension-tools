import { OutputChunk } from 'rollup'
import { ManifestChunk, ResolvedConfig } from 'vite'
import { contentScripts } from './contentScripts'
import { prefix } from './fileWriter-utilities'
import { relative } from './path'

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
    config,
  }: {
    chunks: Map<string, OutputChunk>
    files: Map<string, ManifestChunk>
    config: ResolvedConfig
  },
  resources: FileResources = {
    assets: new Set(),
    css: new Set(),
    imports: new Set(),
  },
  processedFiles = new Set(),
): FileResources {
  if (processedFiles.has(fileName)) {
    return resources
  }
  processedFiles.add(fileName)

  const chunk = chunks.get(fileName)
  if (chunk) {
    const { modules, facadeModuleId, imports, dynamicImports } = chunk
    for (const x of imports) resources.imports.add(x)
    for (const x of dynamicImports) resources.imports.add(x)
    for (const x of [...imports, ...dynamicImports])
      compileFileResources(x, { chunks, files, config }, resources, processedFiles)
    for (const m of Object.keys(modules))
      if (m !== facadeModuleId) {
        const key = prefix('/', relative(config.root, m.split('?')[0]))
        const script = contentScripts.get(key)
        if (script)
          if (typeof script.fileName === 'undefined') {
            throw new Error(`Content script fileName for ${m} is undefined`)
          } else {
            resources.imports.add(script.fileName)
            compileFileResources(
              script.fileName,
              { chunks, files, config },
              resources,
              processedFiles,
            )
          }
      }
  }
  const file = files.get(fileName)
  if (file) {
    const { assets = [], css = [] } = file
    for (const x of assets) resources.assets.add(x)
    for (const x of css) resources.css.add(x)
  }
  return resources
}
