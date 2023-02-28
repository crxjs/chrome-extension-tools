import { ModuleNode } from 'vite'

export type FullModuleNode = ModuleNode & {
  file: string
  importers: Set<FullModuleNode>
}

/** Determine if a changed file was imported by a file */
export function isImporter(file: string) {
  const seen = new Set<ModuleNode>()
  const pred = (changedNode: ModuleNode): changedNode is FullModuleNode => {
    seen.add(changedNode)

    if (changedNode.file === file) return true
    // crawl back up the dependency tree
    for (const parentNode of changedNode.importers) {
      // check each node once to handle shared files
      const unseen = !seen.has(parentNode)
      if (unseen && pred(parentNode)) return true
    }

    return false
  }
  return pred
}
