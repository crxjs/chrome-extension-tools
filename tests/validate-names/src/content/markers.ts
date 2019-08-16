import {
  linkClassName,
  imageClassName,
  getColorClassName,
  textClassName,
  multiFindClassName,
} from '../CLASS_NAMES'

import Mark from 'mark.js'
import { Item } from '../state'

export const markBody = new Mark(document.body)

export function unmarkAll() {
  markBody.unmark()
  unmarkByClassName(linkClassName)
  unmarkByClassName(imageClassName)
}

export function unmarkByClassName(className: string) {
  document.querySelectorAll(`.${className}`).forEach((el) => {
    const classNames = el.className
      .split(' ')
      .filter((name) => !name.includes('multi-find'))

    el.className = classNames.join(' ')
  })
}

export function unmarkText() {
  markBody.unmark()
}

export function markText(item: Item) {
  const className = `${multiFindClassName} ${getColorClassName(
    item.color,
  )} ${textClassName}`

  markBody.mark(item.data, {
    className,
    accuracy: {
      value: 'exactly',
      // "exactly" sees words as including the puntuation mark
      limiters: ':;.,-–—‒_(){}[]!\'"+='.split(''),
    },
    separateWordSearch: false,
    // ignorePunctuation: ':;.,-–—‒_(){}[]!\'"+='.split(''),
  })
}

export function markLinks(item: Item) {
  const linkSelector = `a[href="${item.data}"]`

  const elements = document.querySelectorAll(linkSelector)

  if (elements.length > 0) {
    elements.forEach((el) => {
      el.classList.add(
        multiFindClassName,
        linkClassName,
        getColorClassName(item.color),
      )
    })
  } else {
    // console.error('Could not find match')
  }
}

export function markImages(item: Item) {
  const selectors = [
    `img[src="${item.data}"]`,
    `img[srcset*="${item.data}"]`,
  ]

  const elements = selectors.flatMap((s) =>
    Array.from(document.querySelectorAll(s)),
  )

  if (elements.length > 0) {
    elements.forEach((el) => {
      el.classList.add(
        multiFindClassName,
        imageClassName,
        getColorClassName(item.color),
      )
    })
  } else {
    // console.error('Could not find match')
  }
}
