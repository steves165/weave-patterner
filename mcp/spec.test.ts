import { describe, expect, it } from 'vitest'
import { ascii, edgeCaseDraft, greenBlocks } from '../src/testUtils'
import { computeDrawdown } from '../src/weave'
import { draftToSpec, specToDraft } from './spec'

const twill = {
  name: 'Twill',
  shafts: 4,
  threading: [1, 2, 3, 4],
  tieup: [
    [1, 2],
    [2, 3],
    [3, 4],
    [4, 1],
  ],
  treadling: [1, 2, 3, 4],
}

describe('specToDraft', () => {
  it('builds a 2/2 twill from one repeat', () => {
    const d = specToDraft({ ...twill, ends: 8, picks: 4 })
    expect(ascii(d)).toEqual(['##..##..', '.##..##.', '..##..##', '#..##..#'])
    expect(d.warpColors).toEqual(Array(8).fill('#8b0a0a'))
  })

  it('cycles colour sequences and lower-cases them', () => {
    const d = specToDraft({
      ...twill,
      ends: 5,
      picks: 3,
      warp_colors: ['#AA0000', '#00aa00'],
      weft_colors: ['#ffffff'],
    })
    expect(d.warpColors).toEqual(['#aa0000', '#00aa00', '#aa0000', '#00aa00', '#aa0000'])
    expect(d.weftColors).toEqual(Array(3).fill('#ffffff'))
  })

  it('accepts unthreaded ends, empty picks and several treadles per pick', () => {
    const d = specToDraft({ ...twill, threading: [1, 0, 3, 4], treadling: [0, [1, 3]] })
    expect(d.threading).toEqual([0, -1, 2, 3])
    expect(ascii(d)).toEqual(['....', '#.##'])
  })

  it('turns a lift plan into a straight tie-up', () => {
    const d = specToDraft({
      name: 'L',
      shafts: 4,
      threading: [1, 2, 3, 4],
      liftplan: [
        [1, 2],
        [2, 3],
      ],
    })
    expect(d.treadles).toBe(4)
    expect(ascii(d)).toEqual(['##..', '.##.'])
  })

  it.each([
    [{ ...twill, threading: [5] }, /shaft 5 but there are only 4/],
    [{ ...twill, tieup: [[9]] }, /tieup lifts shaft 9/],
    [{ ...twill, treadles: 4, treadling: [7] }, /treadle 7 but there are only 4/],
    [{ ...twill, treadles: 2 }, /tieup has 4 treadles but treadles is 2/],
    [{ ...twill, liftplan: [[1]] }, /either liftplan or tieup/],
    [{ name: 'x', shafts: 4, threading: [1] }, /Give tieup and treadling/],
  ])('explains invalid input %#', (spec, message) => {
    expect(() => specToDraft(spec)).toThrow(message)
  })
})

describe('draftToSpec', () => {
  it.each([
    ['green blocks', greenBlocks()],
    ['edge cases', edgeCaseDraft()],
  ])('is the inverse of specToDraft for %s', (_, d) => {
    expect(specToDraft(draftToSpec('x', d))).toEqual(d)
    expect(computeDrawdown(specToDraft(draftToSpec('x', d)))).toEqual(computeDrawdown(d))
  })
})
