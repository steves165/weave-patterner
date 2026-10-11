import { describe, expect, it } from 'vitest'
import { drawSquare, pruneAdded } from './drawCloth'
import { computeDrawdown, type Draft, defaultDraft, emptyDraft } from './weave'

/** The squares that differ between two drafts' drawdowns, as "pick,end". */
const changed = (a: Draft, b: Draft) => {
  const [x, y] = [computeDrawdown(a), computeDrawdown(b)]
  const out: string[] = []
  for (let p = 0; p < x.length; p++)
    for (let e = 0; e < x[p].length; e++) if (x[p][e] !== y[p][e]) out.push(`${p},${e}`)
  return out
}

describe('drawing on the drawdown', () => {
  const d = defaultDraft() // 2/2 twill, straight draw on 4 shafts and 4 treadles
  const dd = computeDrawdown(d)

  it('changes only the square drawn, wherever it is', () => {
    for (const [p, e] of [
      [0, 0],
      [5, 9],
      [31, 31],
      [12, 3],
    ]) {
      const next = drawSquare(d, p, e, !dd[p][e])
      expect(changed(d, next)).toEqual([`${p},${e}`])
      expect(next.ends).toBe(d.ends)
      expect(next.picks).toBe(d.picks)
    }
  })

  it('does nothing when the square is already that way', () => {
    expect(drawSquare(d, 0, 0, dd[0][0])).toBe(d)
  })

  it('reuses what the draft has before adding shafts or treadles', () => {
    // Drawing a whole column like end 2's onto end 1: by the last square it's just rethreaded onto end 2's shaft.
    let next = d
    for (let p = 0; p < d.picks; p++) next = pruneAdded(drawSquare(next, p, 0, dd[p][1]), d)
    expect(computeDrawdown(next).map((r) => r[0])).toEqual(dd.map((r) => r[1]))
    expect(next.threading[0]).toBe(d.threading[1])
    expect(next.shafts).toBe(4)
    expect(next.treadles).toBe(4)
  })

  it('adds one shaft and one treadle when nothing fits, and keeps the rest of the draft as it was', () => {
    const next = drawSquare(d, 0, 0, !dd[0][0])
    expect(next.shafts).toBe(5)
    expect(next.treadles).toBe(5)
    expect(next.threading.slice(1)).toEqual(d.threading.slice(1))
    expect(next.treadling.slice(1).map((r) => r.slice(0, 4))).toEqual(d.treadling.slice(1))
    expect(next.tieup.slice(0, 4).map((r) => r.slice(0, 4))).toEqual(d.tieup)
  })

  it('takes away shafts and treadles a stroke added and then left unused', () => {
    const tried = drawSquare(d, 0, 0, !dd[0][0])
    const back = drawSquare(tried, 0, 0, dd[0][0])
    expect(changed(d, back)).toEqual([])
    const pruned = pruneAdded(back, d)
    expect(changed(d, pruned)).toEqual([])
    expect([pruned.shafts, pruned.treadles]).toEqual([4, 4])
    // The draft's own shafts stay, even unused.
    const empty = { ...d, threading: d.threading.map((s) => (s === 3 ? 0 : s)) }
    expect(pruneAdded(empty, empty).shafts).toBe(4)
  })

  it('keeps exactly what was drawn, stroke after stroke, tidying as it goes', () => {
    // A fixed pseudo-random sequence of squares.
    let seed = 7
    const rand = (n: number) => {
      seed = (seed * 1103515245 + 12345) % 2147483648
      return seed % n
    }
    let draft = d
    let want = computeDrawdown(d).map((r) => [...r])
    for (let stroke = 0; stroke < 200; stroke++) {
      const base = draft
      for (let k = 0; k < 1 + rand(4); k++) {
        const [p, e] = [rand(d.picks), rand(d.ends)]
        want[p][e] = !want[p][e]
        draft = pruneAdded(drawSquare(draft, p, e, want[p][e]), base)
      }
      expect(computeDrawdown(draft)).toEqual(want)
    }
    want = computeDrawdown(draft)
    expect(draft.shafts).toBeLessThanOrEqual(128)
  })

  it('uses the shafts and treadles the draft already has before adding any', () => {
    let draft = emptyDraft()
    const base = draft
    // A row and a diagonal on a blank draft: four squares, the draft's four shafts and treadles.
    for (const [p, e] of [
      [0, 0],
      [1, 1],
      [0, 4],
      [2, 2],
      [3, 3],
    ]) {
      const before = draft
      draft = pruneAdded(drawSquare(draft, p, e, true), base)
      expect(changed(before, draft)).toEqual([`${p},${e}`])
    }
    expect([draft.shafts, draft.treadles]).toEqual([4, 4])
    // Rubbing one out changes the tie-up rather than adding anything.
    const rubbed = pruneAdded(drawSquare(draft, 1, 1, false), base)
    expect(changed(draft, rubbed)).toEqual(['1,1'])
    expect([rubbed.shafts, rubbed.treadles]).toEqual([4, 4])
  })

  it('adds a shaft only when the existing ones would change other squares', () => {
    let draft = emptyDraft()
    const base = draft
    draft = pruneAdded(drawSquare(draft, 0, 0, true), base)
    draft = pruneAdded(drawSquare(draft, 0, 4, true), base)
    // End 1 shares its shaft with end 5; drawing end 1 on pick 5 can't move both.
    for (const [p, e] of [
      [1, 1],
      [2, 2],
      [3, 3],
    ])
      draft = pruneAdded(drawSquare(draft, p, e, true), base)
    expect(draft.shafts).toBe(4)
    const next = pruneAdded(drawSquare(draft, 4, 0, true), base)
    expect(changed(draft, next)).toEqual(['4,0'])
    expect(next.shafts).toBe(5)
  })
})
