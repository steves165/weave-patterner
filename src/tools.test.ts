import { describe, expect, it } from 'vitest'
import { ascii } from './testUtils'
import { advancing, applyRangeOp, MAX_THREADS, parseSequence, point, straight, trompAsWrit } from './tools'
import { defaultDraft } from './weave'

const shafts = (d: { threading: number[] }) => d.threading.map((s) => s + 1).join('')
const treadles = (d: { treadling: boolean[][] }) => d.treadling.map((r) => r.indexOf(true) + 1).join('')

describe('parseSequence', () => {
  it('reads numbers, commas and up/down ranges', () => {
    expect(parseSequence('1 2, 3-5 4-2  0')).toEqual([1, 2, 3, 4, 5, 4, 3, 2, 0])
  })
  it.each(['', 'a', '1 2 x'])('rejects %j', (text) => {
    expect(() => parseSequence(text)).toThrow()
  })
})

describe('generators', () => {
  it('builds straight, point and advancing draws', () => {
    expect(straight(4)).toEqual([1, 2, 3, 4])
    expect(point(4)).toEqual([1, 2, 3, 4, 3, 2])
    expect(advancing(8, 4, 2)).toEqual([1, 2, 3, 4, 3, 4, 5, 6, 5, 6, 7, 8, 7, 8, 1, 2])
    expect(advancing(4, 3, 1)).toHaveLength(12)
  })
})

describe('applyRangeOp', () => {
  const twill = () => {
    const d = defaultDraft()
    d.warpColors = d.warpColors.map((_, i) => (i < 4 ? `#00000${i}` : d.warpColors[i]))
    return d
  }

  it('fills a range by cycling a sequence', () => {
    const d = applyRangeOp(defaultDraft(), 'threading', 1, 8, { kind: 'fill', sequence: [1, 2, 3, 4, 3, 2] })
    expect(shafts(d).slice(0, 10)).toBe('1234321212') // ends 9+ keep their straight draw
    expect(d.ends).toBe(32)
  })

  it('treats 0 as unthreaded / no treadle', () => {
    const d = applyRangeOp(defaultDraft(), 'threading', 1, 2, { kind: 'fill', sequence: [0] })
    expect(d.threading.slice(0, 3)).toEqual([-1, -1, 2])
    const t = applyRangeOp(defaultDraft(), 'treadling', 1, 1, { kind: 'fill', sequence: [0] })
    expect(t.treadling[0]).toEqual([false, false, false, false])
  })

  it('repeats a range, carrying colours with their threads', () => {
    const d = applyRangeOp(twill(), 'threading', 1, 4, { kind: 'repeat', times: 2 })
    expect(d.ends).toBe(40)
    expect(shafts(d).slice(0, 12)).toBe('123412341234')
    expect(d.warpColors.slice(4, 8)).toEqual(['#000000', '#000001', '#000002', '#000003'])
  })

  it('mirrors a range into a point without doubling the turn', () => {
    const d = applyRangeOp(defaultDraft(), 'threading', 1, 4, { kind: 'mirror' })
    expect(shafts(d).slice(0, 8)).toBe('12343211')
    expect(d.ends).toBe(35)
  })

  it('reverses, deletes and inserts', () => {
    expect(shafts(applyRangeOp(defaultDraft(), 'threading', 1, 4, { kind: 'reverse' })).slice(0, 4)).toBe('4321')
    const del = applyRangeOp(defaultDraft(), 'threading', 2, 3, { kind: 'delete' })
    expect([del.ends, shafts(del).slice(0, 4)]).toEqual([30, '1412'])
    const ins = applyRangeOp(defaultDraft(), 'threading', 2, 2, { kind: 'insert', count: 2 })
    expect([ins.ends, ins.threading.slice(0, 4)]).toEqual([34, [0, -1, -1, 1]])
    const end = applyRangeOp(defaultDraft(), 'threading', 33, 33, { kind: 'insert', count: 1 })
    expect(end.threading[32]).toBe(-1)
  })

  it('works on the treadling and weft colours too', () => {
    const d = defaultDraft()
    d.weftColors[0] = '#123456'
    const r = applyRangeOp(d, 'treadling', 1, 2, { kind: 'repeat', times: 1 })
    expect([r.picks, treadles(r).slice(0, 6)]).toEqual([34, '121234'])
    expect(r.weftColors[2]).toBe('#123456')
  })

  it.each([
    [0, 4, { kind: 'reverse' as const }, /between 1 and 32/],
    [5, 4, { kind: 'reverse' as const }, /between 1 and 32/],
    [1, 33, { kind: 'reverse' as const }, /between 1 and 32/],
    [1, 4, { kind: 'fill' as const, sequence: [5] }, /Shaft 5 doesn't exist/],
    [1, 32, { kind: 'delete' as const }, /at least one end/],
    [1, 32, { kind: 'repeat' as const, times: 20 }, new RegExp(`limit is ${MAX_THREADS}`)],
  ])('rejects range %i-%i %o', (from, to, op, message) => {
    expect(() => applyRangeOp(defaultDraft(), 'threading', from, to, op)).toThrow(message)
  })

  it('checks treadle numbers on the treadling', () => {
    expect(() => applyRangeOp(defaultDraft(), 'treadling', 1, 2, { kind: 'fill', sequence: [7] })).toThrow(
      /Treadle 7 doesn't exist/,
    )
  })
})

describe('trompAsWrit', () => {
  it('treadles as drawn in: the treadling copies the threading', () => {
    const d = applyRangeOp(defaultDraft(), 'threading', 1, 32, { kind: 'fill', sequence: point(4) })
    const { draft, skipped } = trompAsWrit(d)
    expect(skipped).toBe(0)
    expect(draft.picks).toBe(32)
    expect(treadles(draft)).toBe(shafts(d))
    // Each pick lifts the shaft its own end is on, so woven as drawn in the main diagonal is all warp.
    const rows = ascii(draft)
    expect(rows.every((row, p) => row[p] === '#')).toBe(true)
  })

  it('counts ends on shafts with no matching treadle', () => {
    const d = defaultDraft()
    d.threading[0] = -1
    expect(trompAsWrit(d).skipped).toBe(1)
  })
})
