import { first } from 'rxjs/operators'
import { sendOptOk } from './messages'
import { tabIds } from './storage'

tabIds.valueStream
  .pipe(first(({ id }) => typeof id !== 'undefined'))
  .subscribe(({ id }) => {
    const h1 = document.createElement('h1')
    h1.innerText = `${id}`
    document.body.append(h1)

    sendOptOk(undefined, { tabId: id })
  })
