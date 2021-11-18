import { OutputAsset } from 'rollup'
import {
  HtmlTagDescriptor,
  IndexHtmlTransformContext,
  IndexHtmlTransformHook,
  ViteDevServer,
} from 'vite'
import { isFunction, isString, isUndefined } from './helpers'
import { parse } from './path'
import { CrxPlugin } from './types'

export const transformIndexHtml = (): CrxPlugin => {
  const preHooks = new Set<IndexHtmlTransformHook>()
  const postHooks = new Set<IndexHtmlTransformHook>()

  let server: ViteDevServer | undefined

  return {
    name: 'transform-index-html',
    crx: true,
    configResolved({ plugins }) {
      plugins.forEach(({ transformIndexHtml: hook }) => {
        if (isUndefined(hook)) return
        if (isFunction(hook)) {
          postHooks.add(hook)
        } else if (hook.enforce === 'pre') {
          preHooks.add(hook.transform)
        } else {
          postHooks.add(hook.transform)
        }
      })
    },
    configureServer(s) {
      server = s
    },
    // Apply prehooks
    async transformCrxHtml(html, { id, fileName }) {
      if (server)
        return server.transformIndexHtml(fileName, html, id)

      return applyHtmlTransforms(html, Array.from(preHooks), {
        path: fileName,
        filename: id,
      })
    },
    // Apply posthooks
    async generateBundle(options, bundle) {
      if (server) return

      const hooks = Array.from(postHooks)

      const htmlFiles = Object.entries(bundle).filter(
        (x): x is [string, OutputAsset] =>
          x[1].type === 'asset' &&
          parse(x[1].fileName).ext === '.html',
      )

      for (const [id, file] of htmlFiles) {
        if (!isString(file.source)) continue

        const context: IndexHtmlTransformContext = {
          filename: '/' + file.fileName,
          path: id,
          bundle,
        }

        const source = await applyHtmlTransforms(
          file.source,
          hooks,
          context,
        )

        bundle[id] = Object.assign(file, { source })
      }
    },
  }
}

export async function applyHtmlTransforms(
  html: string,
  hooks: IndexHtmlTransformHook[],
  ctx: IndexHtmlTransformContext,
): Promise<string> {
  const headTags: HtmlTagDescriptor[] = []
  const headPrependTags: HtmlTagDescriptor[] = []
  const bodyTags: HtmlTagDescriptor[] = []
  const bodyPrependTags: HtmlTagDescriptor[] = []

  for (const hook of hooks) {
    const res = await hook(html, ctx)
    if (!res) {
      continue
    }
    if (typeof res === 'string') {
      html = res
    } else {
      let tags: HtmlTagDescriptor[]
      if (Array.isArray(res)) {
        tags = res
      } else {
        html = res.html || html
        tags = res.tags
      }
      for (const tag of tags) {
        if (tag.injectTo === 'body') {
          bodyTags.push(tag)
        } else if (tag.injectTo === 'body-prepend') {
          bodyPrependTags.push(tag)
        } else if (tag.injectTo === 'head') {
          headTags.push(tag)
        } else {
          headPrependTags.push(tag)
        }
      }
    }
  }

  // inject tags
  if (headPrependTags.length) {
    html = injectToHead(html, headPrependTags, true)
  }
  if (headTags.length) {
    html = injectToHead(html, headTags)
  }
  if (bodyPrependTags.length) {
    html = injectToBody(html, bodyPrependTags, true)
  }
  if (bodyTags.length) {
    html = injectToBody(html, bodyTags)
  }

  return html
}

const headInjectRE = /<\/head>/
const headPrependInjectRE = [/<head>/, /<!doctype html>/i]
function injectToHead(
  html: string,
  tags: HtmlTagDescriptor[],
  prepend = false,
) {
  const tagsHtml = serializeTags(tags)
  if (prepend) {
    // inject after head or doctype
    for (const re of headPrependInjectRE) {
      if (re.test(html)) {
        return html.replace(re, `$&\n${tagsHtml}`)
      }
    }
  } else {
    // inject before head close
    if (headInjectRE.test(html)) {
      return html.replace(headInjectRE, `${tagsHtml}\n  $&`)
    }
  }
  // if no <head> tag is present, just prepend
  return tagsHtml + '\n' + html
}

const bodyInjectRE = /<\/body>/
const bodyPrependInjectRE = /<body[^>]*>/
function injectToBody(
  html: string,
  tags: HtmlTagDescriptor[],
  prepend = false,
) {
  if (prepend) {
    // inject after body open
    const tagsHtml = '\n' + serializeTags(tags)
    if (bodyPrependInjectRE.test(html)) {
      return html.replace(bodyPrependInjectRE, `$&\n${tagsHtml}`)
    }
    // if no body, prepend
    return tagsHtml + '\n' + html
  } else {
    // inject before body close
    const tagsHtml = '\n' + serializeTags(tags)
    if (bodyInjectRE.test(html)) {
      return html.replace(bodyInjectRE, `${tagsHtml}\n$&`)
    }
    // if no body, append
    return html + '\n' + tagsHtml
  }
}

const unaryTags = new Set(['link', 'meta', 'base'])

function serializeTag({
  tag,
  attrs,
  children,
}: HtmlTagDescriptor): string {
  if (unaryTags.has(tag)) {
    return `<${tag}${serializeAttrs(attrs)}>`
  } else {
    return `<${tag}${serializeAttrs(attrs)}>${serializeTags(
      children,
    )}</${tag}>`
  }
}

function serializeTags(
  tags: HtmlTagDescriptor['children'],
): string {
  if (typeof tags === 'string') {
    return tags
  } else if (tags) {
    return `  ${tags.map(serializeTag).join('\n    ')}`
  }
  return ''
}

function serializeAttrs(
  attrs: HtmlTagDescriptor['attrs'],
): string {
  let res = ''
  for (const key in attrs) {
    if (typeof attrs[key] === 'boolean') {
      res += attrs[key] ? ` ${key}` : ''
    } else {
      res += ` ${key}=${JSON.stringify(attrs[key])}`
    }
  }
  return res
}
