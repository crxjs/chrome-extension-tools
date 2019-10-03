interface ContentScript {
  css: string[]
  js: string[]
  matches: string[]
}

export interface ChromeExtensionManifest {
  manifest_version: number
  name: string
  version: string
  description: string
  chrome_url_overrides?: {
    bookmarks: string
    history: string
    newtab: string
  }
  short_name?: string
  permissions?: string[]
  content_security_policy?: string
  content_scripts?: ContentScript[]
  web_accessible_resources?: string[]
  background?: {
    scripts?: string[]
    page?: string
    persistent?: boolean
  }
  key?: string
  browser_action?: {
    default_icon?:
      | string
      | {
          [size: string]: string
        }
    default_title: string
    default_popup: string
  }
  page_action?: {
    default_icon?:
      | string
      | {
          [size: string]: string
        }
    default_title: string
    default_popup: string
  }
}
