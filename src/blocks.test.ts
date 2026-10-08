import { describe, expect, it } from 'vitest'
import { turnedTwill } from './blocks'
import { longestFloats } from './floats'
import { computeDrawdown } from './weave'

const twoBlocks = {
  threading: [1, 2, 2, 1],
  treadling: [1, 2],
  tieup: [
    [true, false],
    [false, true],
  ],
}

describe('turnedTwill', () => {
  it('expands each profile unit into 4 ends or picks on its own shafts and treadles', () => {
    const d = turnedTwill(twoBlocks, ['#000000'], ['#ffffff'])
    expect([d.shafts, d.treadles, d.ends, d.picks]).toEqual([8, 8, 16, 8])
    expect(d.threading.map((s) => s + 1)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 5, 6, 7, 8, 1, 2, 3, 4])
  })

  it('weaves warp-faced 3/1 twill where the profile is on and weft-faced 1/3 elsewhere', () => {
    const d = turnedTwill(twoBlocks, ['#000000'], ['#ffffff'])
    const dd = computeDrawdown(d)
    const warpShare = (rows: number[], cols: number[]) =>
      rows.flatMap((p) => cols.map((e) => dd[p][e])).filter(Boolean).length / (rows.length * cols.length)
    const block1 = [0, 1, 2, 3]
    const block2 = [4, 5, 6, 7]
    const tr1 = [0, 1, 2, 3]
    expect(warpShare(tr1, block1)).toBe(0.75) // pattern
    expect(warpShare(tr1, block2)).toBe(0.25) // background
    expect(longestFloats(d).warp).toBeLessThanOrEqual(4)
  })

  it.each([
    [{ ...twoBlocks, threading: [3] }, /Block 3 isn't/],
    [{ ...twoBlocks, tieup: [] }, /1 to 4 blocks/],
    [{ ...twoBlocks, treadling: [] }, /at least one profile unit/],
  ])('rejects bad profiles %#', (profile, message) => {
    expect(() => turnedTwill(profile, ['#000000'], ['#ffffff'])).toThrow(message)
  })
})
