import { loadAssetData } from '../helpers'
import { getCssHrefs, getImgSrcs, getJsAssets } from './cheerio'

/* ------------- helper functions ------------- */

export const not = fn => x => !fn(x)

export const isHtml = path => /\.html?$/.test(path)

export const loadHtmlAssets = htmlData =>
  Promise.all(
    htmlData.map(async data =>
      data.concat({
        js: await Promise.all(
          getJsAssets(data).map(loadAssetData),
        ),
        img: await Promise.all(
          getImgSrcs(data).map(loadAssetData),
        ),
        css: await Promise.all(
          getCssHrefs(data).map(loadAssetData),
        ),
      }),
    ),
  )
