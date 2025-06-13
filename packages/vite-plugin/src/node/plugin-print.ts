import { CrxPluginFn } from "./types"
import pc from 'picocolors'

/**
 * terminal font design form https://github.com/nyaggah/bedframe
 * MIT
 * https://github.com/nyaggah/bedframe/blob/main/packages/core/src/lib/get-manifest.ts#L66
 */
function printStr(dir:string) {
  return `  ${pc.magentaBright('C H R O M E')}
  ${pc.greenBright('E X T E N S I O N')}
  ${pc.blueBright('T O O L S')}
  
  ${pc.green('➜')}  ${pc.bold('CRXJS')}: ${pc.green(`Load ${pc.cyan(dir)} as unpacked extension`)}`
} 

export const pluginPrint:CrxPluginFn = () => {
  let outDir = 'dist';
  return [
    {
      name: 'crx:print',
      enforce: 'pre',
      configResolved(resolvedConfig) {
        outDir = resolvedConfig.build.outDir;
      },
      configureServer(server) {
        server.printUrls = () => {
          console.log(printStr(outDir))
        }
      },
    },
  ]
}
