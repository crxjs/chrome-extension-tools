const tagName = 'crx-clone-node-test'

if (!customElements.get(tagName)) {
  customElements.define(
    tagName,
    class extends HTMLElement {
      connectedCallback() {
        this.dataset.upgraded = 'true'
        this.textContent = 'upgraded'
      }
    },
  )
}

const element = document.createElement(tagName)
element.id = 'custom-element-result'
document.body.append(element)

const result = document.createElement('div')
result.id = 'document-clone-node-result'

try {
  const clone = document.cloneNode(true)

  result.dataset.status =
    element.dataset.upgraded === 'true' &&
    clone instanceof Document &&
    clone.documentElement?.nodeName === 'HTML'
      ? 'ok'
      : 'invalid-clone'
} catch (error) {
  result.dataset.status = 'error'
  result.textContent = error instanceof Error ? error.message : String(error)
}

document.body.append(result)

export {}
