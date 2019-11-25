import { Observable, Subject } from 'rxjs'

// TODO: make this a proper observable
const _selectorRemovedStream = new Subject()
export const selectorRemovedStream = _selectorRemovedStream.asObservable()

/**
 * Streams all current and future Elements that match the selector.
 *
 * @param {Element} element A DOM Element, for example `document.body`
 * @param {string} selector A CSS selector
 * @returns {Observable<Element>} Elements that match the selector
 */
export const querySelectorStream = (element, selector) =>
  new Observable((subscriber) => {
    // Initialize results with current nodes
    element
      .querySelectorAll(selector)
      .forEach((el) => subscriber.next(el))

    // Create observer instance
    const observer = new MutationObserver(function(mutations) {
      mutations.forEach(function(mutation) {
        if (mutation.type === 'childList') {
          Array.from(mutation.addedNodes)
            // Node is Element
            .filter(
              (node) => node.nodeType === Node.ELEMENT_NODE,
            )
            // Element matches CSS selector
            .filter((el) => el.matches(selector))
            // Emit from Observable
            .forEach((el) => {
              // console.log('match added', el)
              return subscriber.next(el)
            })
        } else if (mutation.type === 'attributes') {
          const { target, oldValue } = mutation
          const className = selector.slice(1)
          const matched =
            oldValue && oldValue.includes(className)
          const matches = target.matches(selector)

          if (matches && !matched) {
            console.log('class added', mutation)
            subscriber.next(target)
          } else if (matched && !matches) {
            console.log('class removed', mutation)
            _selectorRemovedStream.next(target)
          }
        }
      })
    })

    // Set up observer
    observer.observe(element, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class'],
      attributeOldValue: true,
    })

    // Return teardown function
    return () => observer.disconnect()
  })
