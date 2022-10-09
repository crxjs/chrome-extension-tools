import * as fileWriter from './fileWriter'
import { CrxPlugin, CrxPluginFn } from './types'

function sortPlugins(plugins: CrxPlugin[], command?: 'build' | 'serve') {
  const pre: CrxPlugin[] = []
  const mid: CrxPlugin[] = []
  const post: CrxPlugin[] = []
  for (const p of plugins) {
    if (p.apply === command || !p.apply || !command) {
      if (p.enforce === 'pre') pre.push(p)
      else if (p.enforce === 'post') post.push(p)
      else mid.push(p)
    }
  }
  return { pre, mid, post }
}

export const pluginFileWriter =
  (crxPlugins: CrxPlugin[]): CrxPluginFn =>
  () => {
    const { pre, mid, post } = sortPlugins(crxPlugins, 'build')
    // crx plugins, does not include plugins from vite config
    const plugins = [...pre, ...mid, ...post].flat()

    return {
      name: 'crx:file-writer',
      apply: 'serve',
      async config(_config, env) {
        let config = _config
        for (const p of plugins) {
          const r = await p.config?.(config, env)
          config = r ?? config
        }
        return config
      },
      async configResolved(_config) {
        await Promise.all(plugins.map((p) => p.configResolved?.(_config)))
      },
      async configureServer(server) {
        server.httpServer?.once('listening', () => {
          fileWriter.start({ server, plugins })
        })
      },
      closeBundle() {
        try {
          fileWriter.close()
        } catch (error) {
          console.error(error)
        }
      },
    }
  }
