/* ============================================ */
/*               CHECK PERMISSIONS              */
/* ============================================ */

// export const debugger = s => /chromep?[\s\n]*\.[\s\n]*debugger/.test(s)
// export const enterprise.deviceAttributes = s => /chromep?[\s\n]*\.[\s\n]*enterprise\.deviceAttributes/.test(s)
// export const enterprise.hardwarePlatform = s => /chromep?[\s\n]*\.[\s\n]*enterprise\.hardwarePlatform/.test(s)
// export const enterprise.platformKeys = s => /chromep?[\s\n]*\.[\s\n]*enterprise\.platformKeys/.test(s)
// export const networking.config = s => /chromep?[\s\n]*\.[\s\n]*networking\.config/.test(s)
//export const system.cpu = s => /chromep?[\s\n]*\.[\s\n]*system\.cpu/.test(s)
//export const system.display = s => /chromep?[\s\n]*\.[\s\n]*system\.display/.test(s)
//export const system.memory = s => /chromep?[\s\n]*\.[\s\n]*system\.memory/.test(s)
//export const system.storage = s => /chromep?[\s\n]*\.[\s\n]*system\.storage/.test(s)
export const alarms = (s) =>
  /chromep?[\s\n]*\.[\s\n]*alarms/.test(s)

export const bookmarks = (s) =>
  /chromep?[\s\n]*\.[\s\n]*bookmarks/.test(s)

export const contentSettings = (s) =>
  /chromep?[\s\n]*\.[\s\n]*contentSettings/.test(s)

export const contextMenus = (s) =>
  /chromep?[\s\n]*\.[\s\n]*contextMenus/.test(s)

export const cookies = (s) =>
  /chromep?[\s\n]*\.[\s\n]*cookies/.test(s)
  
export const declarativeContent = (s) =>
  /chromep?[\s\n]*\.[\s\n]*declarativeContent/.test(s)
export const declarativeNetRequest = (s) =>
  /chromep?[\s\n]*\.[\s\n]*declarativeNetRequest/.test(s)
export const declarativeWebRequest = (s) =>
  /chromep?[\s\n]*\.[\s\n]*declarativeWebRequest/.test(s)
export const desktopCapture = (s) =>
  /chromep?[\s\n]*\.[\s\n]*desktopCapture/.test(s)
export const displaySource = (s) =>
  /chromep?[\s\n]*\.[\s\n]*displaySource/.test(s)
export const dns = (s) => /chromep?[\s\n]*\.[\s\n]*dns/.test(s)
export const documentScan = (s) =>
  /chromep?[\s\n]*\.[\s\n]*documentScan/.test(s)
export const downloads = (s) =>
  /chromep?[\s\n]*\.[\s\n]*downloads/.test(s)
export const experimental = (s) =>
  /chromep?[\s\n]*\.[\s\n]*experimental/.test(s)
export const fileBrowserHandler = (s) =>
  /chromep?[\s\n]*\.[\s\n]*fileBrowserHandler/.test(s)
export const fileSystemProvider = (s) =>
  /chromep?[\s\n]*\.[\s\n]*fileSystemProvider/.test(s)
export const fontSettings = (s) =>
  /chromep?[\s\n]*\.[\s\n]*fontSettings/.test(s)
export const gcm = (s) => /chromep?[\s\n]*\.[\s\n]*gcm/.test(s)
export const geolocation = (s) =>
  /chromep?[\s\n]*\.[\s\n]*geolocation/.test(s)
export const history = (s) =>
  /chromep?[\s\n]*\.[\s\n]*history/.test(s)
export const identity = (s) =>
  /chromep?[\s\n]*\.[\s\n]*identity/.test(s)
export const idle = (s) => /chromep?[\s\n]*\.[\s\n]*idle/.test(s)
export const idltest = (s) =>
  /chromep?[\s\n]*\.[\s\n]*idltest/.test(s)
export const management = (s) =>
  /chromep?[\s\n]*\.[\s\n]*management/.test(s)
export const nativeMessaging = (s) =>
  /chromep?[\s\n]*\.[\s\n]*nativeMessaging/.test(s)
export const notifications = (s) =>
  /chromep?[\s\n]*\.[\s\n]*notifications/.test(s)
export const pageCapture = (s) =>
  /chromep?[\s\n]*\.[\s\n]*pageCapture/.test(s)
export const platformKeys = (s) =>
  /chromep?[\s\n]*\.[\s\n]*platformKeys/.test(s)
export const power = (s) =>
  /chromep?[\s\n]*\.[\s\n]*power/.test(s)
export const printerProvider = (s) =>
  /chromep?[\s\n]*\.[\s\n]*printerProvider/.test(s)
export const privacy = (s) =>
  /chromep?[\s\n]*\.[\s\n]*privacy/.test(s)
export const processes = (s) =>
  /chromep?[\s\n]*\.[\s\n]*processes/.test(s)
export const proxy = (s) =>
  /chromep?[\s\n]*\.[\s\n]*proxy/.test(s)
export const sessions = (s) =>
  /chromep?[\s\n]*\.[\s\n]*sessions/.test(s)
export const signedInDevices = (s) =>
  /chromep?[\s\n]*\.[\s\n]*signedInDevices/.test(s)
export const storage = (s) =>
  /chromep?[\s\n]*\.[\s\n]*storage/.test(s)
export const tabCapture = (s) =>
  /chromep?[\s\n]*\.[\s\n]*tabCapture/.test(s)
// export const tabs = s => /chromep?[\s\n]*\.[\s\n]*tabs/.test(s)
export const topSites = (s) =>
  /chromep?[\s\n]*\.[\s\n]*topSites/.test(s)
export const tts = (s) => /chromep?[\s\n]*\.[\s\n]*tts/.test(s)
export const ttsEngine = (s) =>
  /chromep?[\s\n]*\.[\s\n]*ttsEngine/.test(s)
export const unlimitedStorage = (s) =>
  /chromep?[\s\n]*\.[\s\n]*unlimitedStorage/.test(s)
export const vpnProvider = (s) =>
  /chromep?[\s\n]*\.[\s\n]*vpnProvider/.test(s)
export const wallpaper = (s) =>
  /chromep?[\s\n]*\.[\s\n]*wallpaper/.test(s)
export const webNavigation = (s) =>
  /chromep?[\s\n]*\.[\s\n]*webNavigation/.test(s)
export const webRequest = (s) =>
  /chromep?[\s\n]*\.[\s\n]*webRequest/.test(s)
export const webRequestBlocking = (s) =>
  webRequest(s) && /'blocking'/.test(s)

// TODO: add readClipboard
// TODO: add writeClipboard
