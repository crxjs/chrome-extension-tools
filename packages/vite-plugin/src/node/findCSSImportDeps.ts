import { ModuleNode } from 'vite'

export const CSS_LANGS_RE =
  /\.(css|less|sass|scss|styl|stylus|pcss|postcss|sss)(?:$|\?)/

export const isCSSRequest = (request: string): boolean =>
  CSS_LANGS_RE.test(request)

/** Find all CSS importers of a given node. */
const findCSSImportDeps = (
  node: ModuleNode,
  selfAccepting = true,
): Set<ModuleNode> => {
  const addDeps = (importers: Set<ModuleNode>, deps = new Set<ModuleNode>()) =>
    [...importers].reduce((deps, node): Set<ModuleNode> => {
      if (deps.has(node)) return deps
      if (selfAccepting && !node.isSelfAccepting) return deps
      if (isCSSRequest(node.url)) {
        return addDeps(node.importers, new Set([...deps, node]))
      } else {
        return deps
      }
    }, deps)

  return addDeps(node.importers)
}

export default findCSSImportDeps
