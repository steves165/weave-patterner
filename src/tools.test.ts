import { describe, expect, it } from 'vitest'
import { ascii } from './testUtils'
import {
  advancing,
  applyRangeOp,
  copyRange,
  drawAlong,
  drawRun,
  MAX_THREADS,
  parseSequence,
  pasteClip,
  point,
  straight,
  trompAsWrit,
} from './tools'
import { defaultDraft, resizeDraft } from './weave'

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

describe('copy and paste', () => {
  const coloured = () => {
    const d = defaultDraft()
    d.warpColors = d.warpColors.map((_, i) => (i < 4 ? `#00000${i}` : d.warpColors[i]))
    return d
  }

  it('copies ends with their shafts and colours', () => {
    const clip = copyRange(coloured(), 'threading', 2, 3)
    expect(clip).toEqual({
      source: 'threading',
      items: [
        { nums: [2], color: '#000001' },
        { nums: [3], color: '#000002' },
      ],
    })
  })

  it('pastes over threads, growing the draft past the end', () => {
    const d = coloured()
    const clip = copyRange(d, 'threading', 1, 4)
    const over = pasteClip(d, 'threading', 3, clip, 'overwrite')
    expect([over.ends, shafts(over).slice(0, 8)]).toEqual([32, '12123434'])
    expect(over.warpColors.slice(2, 6)).toEqual(['#000000', '#000001', '#000002', '#000003'])
    const tail = pasteClip(d, 'threading', 31, clip, 'overwrite')
    expect([tail.ends, shafts(tail).slice(28)]).toEqual([34, '121234']) // ends 29-30, then the pasted 4
  })

  it('inserts, optionally keeping the existing colours', () => {
    const d = coloured()
    const ins = pasteClip(d, 'threading', 1, copyRange(d, 'threading', 3, 4), 'insert', false)
    expect([ins.ends, shafts(ins).slice(0, 6)]).toEqual([34, '341234'])
    expect(ins.warpColors.slice(0, 2)).toEqual(['#000000', '#000001'])
  })

  it('pastes threading into the treadling and treadling into the threading', () => {
    const d = applyRangeOp(defaultDraft(), 'threading', 1, 32, { kind: 'fill', sequence: point(4) })
    const t = pasteClip(d, 'treadling', 1, copyRange(d, 'threading', 1, 6), 'overwrite')
    expect(treadles(t).slice(0, 6)).toBe('123432')
    const back = pasteClip(defaultDraft(), 'threading', 1, copyRange(t, 'treadling', 1, 6), 'overwrite')
    expect(shafts(back).slice(0, 6)).toBe('123432')
  })

  it('keeps several treadles on a pick and empty ends as empty', () => {
    const d = defaultDraft()
    d.treadling[0] = [true, false, true, false]
    d.threading[1] = -1
    const t = pasteClip(d, 'treadling', 5, copyRange(d, 'treadling', 1, 1), 'overwrite')
    expect(t.treadling[4]).toEqual([true, false, true, false])
    const e = pasteClip(d, 'threading', 5, copyRange(d, 'threading', 2, 2), 'overwrite')
    expect(e.threading[4]).toBe(-1)
  })

  it.each([
    [() => copyRange(defaultDraft(), 'threading', 0, 2), /between 1 and 32/],
    [
      () => pasteClip(defaultDraft(), 'threading', 34, copyRange(defaultDraft(), 'threading', 1, 2), 'insert'),
      /between 1 and 33/,
    ],
    [
      () => {
        const wide = resizeDraft(defaultDraft(), { shafts: 8 })
        return pasteClip(defaultDraft(), 'threading', 1, copyRange(wide, 'threading', 1, 8), 'overwrite')
      },
      /use shaft 5; this draft has 4 shafts/,
    ],
  ])('reports problems %#', (fn, message) => {
    expect(fn).toThrow(message)
  })

  it(`refuses to grow past ${MAX_THREADS} threads`, () => {
    let d = defaultDraft()
    const clip = copyRange(d, 'threading', 1, 32)
    for (let i = 0; i < 11; i++) d = pasteClip(d, 'threading', 1, clip, 'insert')
    expect(() => pasteClip(d, 'threading', 1, clip, 'insert')).toThrow(/limit is 400/)
  })
})

describe('drawing tools', () => {
  it('draws straight runs that wrap round, up or down', () => {
    expect(drawRun('straight', 0, 6, 4, 1)).toEqual([0, 1, 2, 3, 0, 1])
    expect(drawRun('straight', 1, 5, 4, -1)).toEqual([1, 0, 3, 2, 1])
  })

  it('draws point runs that turn back without repeating the end shaft', () => {
    expect(drawRun('point', 0, 9, 4, 1)).toEqual([0, 1, 2, 3, 2, 1, 0, 1, 2])
    expect(drawRun('point', 3, 5, 4, -1)).toEqual([3, 2, 1, 0, 1])
    expect(drawRun('point', 0, 3, 1, 1)).toEqual([0, 0, 0])
  })

  it('fills the dragged ends or picks, forwards or backwards', () => {
    const d = defaultDraft()
    const t = drawAlong(d, 'threading', 'point', 2, 8, 0, 1)
    expect(t.threading.slice(0, 10).map((s) => s + 1)).toEqual([1, 2, 1, 2, 3, 4, 3, 2, 1, 2])
    const back = drawAlong(d, 'threading', 'straight', 5, 2, 3, 1)
    expect(back.threading.slice(2, 6).map((s) => s + 1)).toEqual([3, 2, 1, 4])
    const tr = drawAlong(d, 'treadling', 'straight', 0, 5, 3, -1)
    expect(tr.treadling.slice(0, 6).map((row) => row.indexOf(true) + 1)).toEqual([4, 3, 2, 1, 4, 3])
  })
})
