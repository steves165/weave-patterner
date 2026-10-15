import { describe, expect, it } from 'vitest'
import { fillWithRepeat } from './repeat'
import { emptyDraft } from './weave'

describe('fill with repeat', () => {
  it('repeats the threading and treadling drawn so far into the empty ends and picks', () => {
    const d = emptyDraft()
    const threading = d.threading.map((s, e) => (e < 6 ? [0, 1, 2, 3, 2, 1][e] : s))
    const treadling = d.treadling.map((row, p) => (p < 4 ? row.map((_, t) => t === p) : row))
    const r = fillWithRepeat({ ...d, threading, treadling })
    expect(r?.ends).toBe(d.ends - 6)
    expect(r?.picks).toBe(d.picks - 4)
    expect(r?.draft.threading.slice(0, 14)).toEqual([0, 1, 2, 3, 2, 1, 0, 1, 2, 3, 2, 1, 0, 1])
    expect(r?.draft.treadling[5].indexOf(true)).toBe(1)
    expect(r?.draft.warpColors).toBe(d.warpColors)
  })

  it('has nothing to fill when the grids are full or empty', () => {
    expect(fillWithRepeat(emptyDraft())).toBeNull()
    const d = emptyDraft()
    expect(fillWithRepeat({ ...d, threading: d.threading.map((_, e) => e % 4) })?.ends ?? 0).toBe(0)
  })
})
