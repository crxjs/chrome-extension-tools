import fs from 'fs-extra'

export const loadAssetData = assetPath =>
  fs.readFile(assetPath).then(src => [assetPath, src])

export const zipArrays = (a1, a2) => a1.map((x, i) => [x, a2[i]])
