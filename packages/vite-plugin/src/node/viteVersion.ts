export function supportsWebSocketConfig(viteVersion: string | undefined) {
  // Older Vite versions do not expose viteVersion in the plugin context.
  if (!viteVersion) return false

  const [major, minor] = viteVersion.split('.').map(Number)
  // WebSocket connection options moved from server.hmr to server.ws in 8.1.
  return major > 8 || (major === 8 && minor >= 1)
}
