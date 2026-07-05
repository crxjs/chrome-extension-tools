import { describe, expect, it } from 'vite-plus/test'
import { getCounterLabel } from './counter'

describe('getCounterLabel', () => {
  it('formats the popup counter label', () => {
    expect(getCounterLabel(3)).toBe('count is 3')
  })
})
