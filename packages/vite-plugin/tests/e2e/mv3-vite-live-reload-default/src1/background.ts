import { onLoad } from './bg-onload'

chrome.runtime.onMessage.addListener(onLoad)
