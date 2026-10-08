import { describe, expect, it } from 'vitest'
import { network, parallel, patternLine } from './network'

describe('patternLine', () => {
  it('interpolates evenly between control points', () => {
    expect(patternLine([1, 9], 5)).toEqual([1, 3, 5, 7, 9])
    expect(patternLine([1, 5, 1], 5)).toEqual([1, 3, 5, 3, 1])
    expect(patternLine([4], 3)).toEqual([4, 4, 4])
    expect(patternLine([], 3)).toEqual([])
  })
})

describe('network', () => {
  it('keeps each end on its strand, closest to the pattern line', () => {
    const shafts = network(patternLine([1, 8, 1], 15), 8, 4)
    // Every end i is on a shaft ≡ i (mod 4).
    expect(shafts.every((s, i) => (s - 1) % 4 === i % 4)).toBe(true)
    // Line: 1..8..1. End 11 is halfway between shafts 3 and 7 (and end 13 between 1 and 5): ties go low.
    expect(shafts).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 5, 6, 3, 4, 1, 2, 3])
  })

  it('a flat line gives a straight draw on the nearest strands', () => {
    expect(network([1, 1, 1, 1, 1], 8, 4)).toEqual([1, 2, 3, 4, 1])
  })

  it.each([
    [8, 1, /2 to 8/],
    [8, 3, /multiple of the initial width/],
  ])('rejects shafts %i with width %i', (shafts, width, message) => {
    expect(() => network([1], shafts, width)).toThrow(message)
  })
})

describe('parallel', () => {
  it('pairs each end with one shifted along', () => {
    expect(parallel([1, 2, 3, 4], 8, 4)).toEqual([1, 5, 2, 6, 3, 7, 4, 8])
    expect(parallel([7, 8], 8, 3)).toEqual([7, 2, 8, 3])
  })
  it('checks shift and shafts', () => {
    expect(() => parallel([1], 8, 8)).toThrow(/1 to 7/)
    expect(() => parallel([9], 8, 2)).toThrow(/Shaft 9/)
  })
})
