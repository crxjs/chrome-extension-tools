import { ManifestChunk } from 'vite'

interface FileResources {
  assets: Set<string>
  css: Set<string>
  imports: Set<string>
}

export function compileFileResources(
  fileName: string,
  files: Map<string, ManifestChunk>,
  resources: FileResources = {
    assets: new Set(),
    css: new Set(),
    imports: new Set(),
  },
): FileResources {
  const file = files.get(fileName)
  if (file) {
    const { assets = [], css = [], imports = [], dynamicImports = [] } = file
    for (const x of assets) resources.assets.add(x)
    for (const x of css) resources.css.add(x)
    for (const x of imports) resources.imports.add(x)
    for (const x of dynamicImports) resources.imports.add(x)
    for (const x of resources.imports) compileFileResources(x, files, resources)
  }
  return resources
}
