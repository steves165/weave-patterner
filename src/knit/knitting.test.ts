import { describe, expect, it } from 'vitest'
import { step } from './KnittingMode'

describe('knitting mode', () => {
  it('steps through the rows and round into the next repeat, and back', () => {
    expect(step({ row: 0, repeat: 1 }, 4, 1)).toEqual({ row: 1, repeat: 1 })
    expect(step({ row: 3, repeat: 1 }, 4, 1)).toEqual({ row: 0, repeat: 2 })
    expect(step({ row: 0, repeat: 2 }, 4, -1)).toEqual({ row: 3, repeat: 1 })
    // Can't go back before the very first row.
    expect(step({ row: 0, repeat: 1 }, 4, -1)).toEqual({ row: 0, repeat: 1 })
  })
})
