import { importPath } from './placeholders'

const url = chrome.runtime.getURL(importPath)
import(/* @vite-ignore */ url).catch((err) => {
  console.warn(
    `Could not import ${importPath} from ${
      chrome.runtime.getManifest().name
    }`,
  )
  console.error(err)
})
