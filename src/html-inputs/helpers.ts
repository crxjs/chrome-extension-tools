import { loadAssetData } from '../helpers'
import { getCssHrefs, getImgSrcs, getJsAssets } from './cheerio'

/* ------------- helper functions ------------- */

export const not = <T>(fn: (x: T) => boolean) => (x: T) => !fn(x)
