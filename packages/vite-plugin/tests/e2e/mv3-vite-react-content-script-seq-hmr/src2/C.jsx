import { useEffect, useState } from 'react'
import { BehaviorSubject } from 'rxjs'

const count$ = new BehaviorSubject(0)

export const C = () => {
  const [count, setCount] = useState(0)
  useEffect(() => {
    count$.subscribe(setCount)
  })

  return (
    <button className='C' onClick={() => count$.next(count + 1)}>
      c-1-{count}
    </button>
  )
}
