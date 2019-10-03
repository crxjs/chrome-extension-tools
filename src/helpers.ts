import fs from 'fs-extra'
import path from 'path'
import { PluginContext } from 'rollup'

export const not = (fn: any) => (x: any) => !fn(x)

export const loadAssetData = (assetPath: string) =>
  fs.readFile(assetPath).then((src) => [assetPath, src])

export const zipArrays = (a1: any[], a2: any[]) =>
  a1.map((x, i) => [x, a2[i]])

export async function getAssetPathMapFns(
  this: PluginContext,
  assets,
) {
  return (await assets).map(([assetPath, assetSrc]) => {
    const name = path.basename(assetPath)
    const id = this.emitAsset(name, assetSrc)
    const assetFileName = this.getAssetFileName(id)

    return (x) => {
      if (typeof x !== 'string') return x

      if (assetPath.endsWith(x)) {
        return assetFileName
      } else {
        return x
      }
    }
  })
}

export const writeFile = (dest) => ([htmlPath, htmlSrc]) => {
  const baseName = path.basename(htmlPath)
  const destPath = path.join(dest, baseName)
  return fs.writeFile(destPath, htmlSrc)
}
