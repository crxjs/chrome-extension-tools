import manifestTiny from './sample_manifests/manifest-1.json'
import { flattenObject } from '../../../src/manifest-input/manifest-parser/flat'
import { siftByPredObj } from '../../../src/manifest-input/manifest-parser/sift'

const predObj = {
  js: s => /\.js$/.test(s),
  css: s => /\.css$/.test(s),
  html: s => /\.html$/.test(s),
  img: s => /\.png$/.test(s),
  filter: v =>
    typeof v === 'string' &&
    v.includes('.') &&
    !v.includes('*') &&
    !/^https?:/.test(v),
}

test('works with default predObj', () => {
  const strings = flattenObject(manifestTiny)
  const result = siftByPredObj(predObj, strings)

  const expObject = {
    css: [],
    html: [],
    img: [
      'images/clip64-icon-16.png',
      'images/clip64-icon-48.png',
      'images/clip64-icon-128.png',
      'images/clip64-icon-16.png',
    ],
    js: ['background.js'],
    remainder: [
      '0.5.1',
      'Decode Base64 to the clipboard.',
      'Jack and Amy Steam <jacksteamdev@gmail.com>',
    ],
    rejected: [
      'contextMenus',
      'notifications',
      false,
      2,
      'Clip64 Base64 Decoder',
      'Clip64',
    ],
  }

  expect(result).toEqual(expObject)
})
