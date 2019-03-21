export default function composePlugins(name, pluginsFn) {
  return function composedPlugins(options) {
    return {
      name,
      options({ plugins: oldPlugins, ...inputOptions }) {
        const newPlugins = oldPlugins.flatMap(plugin =>
          name === plugin.name ? pluginsFn(options) : plugin,
        )

        return {
          ...inputOptions,
          plugins: newPlugins,
        }
      },
    }
  }
}
