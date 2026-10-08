import { describe, expect, it } from 'vitest'
import type { Profile } from './blocks'
import { BLOCK_WEAVES, type BlockWeave, blockWeave, crackleThreading } from './blockWeaves'
import { computeDrawdown, type Draft } from './weave'

const COLORS = { warp: '#eeeeee', pattern: '#1a237e', tabby: '#cccccc' }
const twoBlocks: Profile = {
  threading: [1, 1, 2, 2],
  treadling: [1, 1, 2, 2],
  tieup: [
    [true, false],
    [false, true],
  ],
}
const fourBlocks: Profile = {
  threading: [1, 2, 3, 4],
  treadling: [1, 2, 3, 4],
  tieup: [0, 1, 2, 3].map((b) => [0, 1, 2, 3].map((k) => b === k)),
}

/** Longest run of weft over consecutive ends on one pick. */
const weftFloat = (d: Draft, pick: number, ends: number[]) => {
  const dd = computeDrawdown(d)
  let best = 0
  let run = 0
  for (const e of ends) {
    run = dd[pick][e] ? 0 : run + 1
    best = Math.max(best, run)
  }
  return best
}
/** True if a pick weaves plain weave: the ends it lifts alternate across the cloth. */
const isTabby = (d: Draft, pick: number) => {
  const row = computeDrawdown(d)[pick]
  return row.every((v, e) => e === 0 || v !== row[e - 1])
}
const tabbyPicks = (d: Draft) => d.weftColors.flatMap((c, p) => (c === COLORS.tabby ? [p] : []))

describe('blockWeave', () => {
  it.each(['overshot', 'crackle', 'summer-winter', 'bronson'] as BlockWeave[])(
    '%s: every tabby pick is plain weave',
    (weave) => {
      const d = blockWeave(weave, weave === 'overshot' || weave === 'crackle' ? fourBlocks : twoBlocks, COLORS)
      expect(tabbyPicks(d).length).toBeGreaterThan(0)
      for (const p of tabbyPicks(d)) expect(isTabby(d, p)).toBe(true)
    },
  )

  it('overshot: 4 shafts and 6 treadles, the pattern weft floating over its own block', () => {
    const d = blockWeave('overshot', fourBlocks, COLORS)
    expect([d.shafts, d.treadles, d.ends, d.picks]).toEqual([4, 6, 16, 16])
    expect(d.threading.map((s) => s + 1)).toEqual([1, 2, 1, 2, 3, 2, 3, 2, 3, 4, 3, 4, 1, 4, 1, 4])
    // Pick 1 is block A's pattern pick: it floats over all of block A.
    expect(weftFloat(d, 0, [0, 1, 2, 3])).toBe(4)
    expect(d.weftColors.slice(0, 4)).toEqual([COLORS.pattern, COLORS.tabby, COLORS.pattern, COLORS.tabby])
  })

  it('crackle: units joined by dropping repeats or adding incidentals so odd and even shafts alternate', () => {
    expect(crackleThreading([1, 2]).map((s) => s + 1)).toEqual([1, 2, 3, 2, 3, 4, 3])
    expect(crackleThreading([1, 4]).map((s) => s + 1)).toEqual([1, 2, 3, 2, 1, 4, 1, 2, 1])
    expect(crackleThreading([1, 1]).map((s) => s + 1)).toEqual([1, 2, 3, 2, 1, 2, 3, 2])
    const t = crackleThreading([1, 3, 2, 4, 1, 2, 3, 4, 3, 1]).map((s) => s + 1)
    expect(t.every((s, i) => i === 0 || s % 2 !== t[i - 1] % 2)).toBe(true)
    const d = blockWeave('crackle', fourBlocks, COLORS)
    expect([d.shafts, d.treadles]).toEqual([4, 6])
  })

  it('summer and winter: pattern blocks weft-faced, background blocks warp-faced on pattern picks', () => {
    const d = blockWeave('summer-winter', twoBlocks, COLORS)
    expect([d.shafts, d.treadles]).toEqual([4, 6])
    expect(d.threading.slice(0, 4).map((s) => s + 1)).toEqual([1, 3, 2, 3])
    expect(d.threading.slice(8, 12).map((s) => s + 1)).toEqual([1, 4, 2, 4])
    const dd = computeDrawdown(d)
    // Pick 1 weaves block treadle 1: pattern in block A (ends 1–8), background in block B (ends 9–16).
    const lifted = (ends: number[]) => ends.filter((e) => dd[0][e]).length
    expect(lifted([0, 1, 2, 3, 4, 5, 6, 7])).toBe(2) // only the tie-down ends rise
    expect(lifted([8, 9, 10, 11, 12, 13, 14, 15])).toBe(6) // the pattern shaft rises too
  })

  it('Bronson lace: lace blocks float over five ends, plain blocks weave tabby', () => {
    const d = blockWeave('bronson', twoBlocks, COLORS)
    expect([d.shafts, d.treadles]).toEqual([4, 4])
    expect(d.threading.slice(0, 6).map((s) => s + 1)).toEqual([1, 3, 1, 3, 1, 2])
    // Pick 2 is a lace pick for block treadle 1: lace in block A, plain in B.
    expect(weftFloat(d, 1, [0, 1, 2, 3, 4, 5])).toBe(5)
    expect(weftFloat(d, 1, [12, 13, 14, 15, 16, 17])).toBe(1)
  })

  it("M's and O's: the woven block is ribbed (weft over 4 ends) and the other block plain", () => {
    const d = blockWeave('ms-os', twoBlocks, COLORS)
    expect([d.shafts, d.treadles, d.ends, d.picks]).toEqual([4, 4, 32, 16])
    expect(d.threading.slice(0, 16).map((s) => s + 1)).toEqual([1, 2, 1, 2, 3, 4, 3, 4, 1, 2, 1, 2, 3, 4, 3, 4])
    expect(weftFloat(d, 0, [0, 1, 2, 3, 4, 5, 6, 7])).toBe(4)
    expect(weftFloat(d, 0, [16, 17, 18, 19, 20, 21, 22, 23])).toBe(1)
    expect(new Set(d.weftColors)).toEqual(new Set([COLORS.pattern]))
  })

  it('block weaves weave each block on its own treadle; unit weaves follow the profile tie-up', () => {
    expect(BLOCK_WEAVES.overshot.freeTieup).toBe(false)
    const crossed: Profile = {
      ...twoBlocks,
      tieup: [
        [true, true],
        [false, true],
      ],
    }
    const plain = blockWeave('summer-winter', twoBlocks, COLORS)
    const both = blockWeave('summer-winter', crossed, COLORS)
    expect(computeDrawdown(both)).not.toEqual(computeDrawdown(plain))
    expect(computeDrawdown(blockWeave('ms-os', crossed, COLORS))).toEqual(
      computeDrawdown(blockWeave('ms-os', twoBlocks, COLORS)),
    )
  })

  it.each([
    ['overshot', { threading: [1], treadling: [1], tieup: Array.from({ length: 5 }, () => [true]) }, /1 to 4 blocks/],
    ['ms-os', { threading: [3], treadling: [1], tieup: [[true], [true]] }, /Block 3 isn't/],
    ['bronson', { threading: Array(80).fill(1), treadling: [1], tieup: [[true]] }, /too long/],
  ] as [BlockWeave, Profile, RegExp][])('%s rejects bad profiles', (weave, profile, message) => {
    expect(() => blockWeave(weave, profile, COLORS)).toThrow(message)
  })
})
