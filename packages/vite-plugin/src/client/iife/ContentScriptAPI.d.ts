interface ContentScriptAPI {
  run?: (options: { perf: { injectTime: number; loadTime: number } }) => void
}
