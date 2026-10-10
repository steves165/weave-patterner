import { describe, expect, it } from 'vitest'
import { floatFixes, selvedgeFixes, unwovenFixes } from './fixes'
import { longestFloats, unwovenThreads } from './floats'
import { selvedgeMisses } from './selvedge'
import { computeDrawdown, type Draft, defaultDraft } from './weave'

const fix = (fixes: ReturnType<typeof unwovenFixes>, id: string) => {
  const f = fixes.find((x) => x.id === id)
  if (!f) throw new Error(`no fix ${id}: ${fixes.map((x) => x.id).join(', ')}`)
  return f
}

describe('fixes for threads not woven in', () => {
  // Shaft 3 tied to no treadle: its ends never rise.
  const untied: Draft = (() => {
    const d = defaultDraft()
    return { ...d, tieup: d.tieup.map((row, s) => (s === 2 ? row.map(() => false) : row)) }
  })()

  it('rethreads the ends onto a shaft that weaves, carrying on the draw', () => {
    const ends = unwovenThreads(untied).ends
    expect(ends.length).toBeGreaterThan(0)
    const f = fix(unwovenFixes(untied), 'rethread-ends')
    expect(f.resolves).toBe(true)
    expect(f.title).toBe(`Rethread ${ends.length} ends`)
    expect(unwovenThreads(f.draft as Draft).ends).toEqual([])
    // Only those ends moved.
    const moved = (f.draft as Draft).threading.flatMap((s, e) => (s !== untied.threading[e] ? [e] : []))
    expect(moved).toEqual(ends)
  })

  it('or leaves them unthreaded', () => {
    const f = fix(unwovenFixes(untied), 'unthread-ends')
    expect(unwovenThreads(f.draft as Draft).ends).toEqual([])
    expect((f.draft as Draft).threading.filter((s) => s < 0)).toHaveLength(unwovenThreads(untied).ends.length)
  })

  it('moves picks whose treadle lifts every shaft onto one that weaves', () => {
    const d = defaultDraft()
    // Treadle 1 lifts every shaft.
    const allUp = { ...d, tieup: d.tieup.map((row) => row.map((v, t) => (t === 0 ? true : v))) }
    const picks = unwovenThreads(allUp).picks
    expect(picks.length).toBeGreaterThan(0)
    const f = fix(unwovenFixes(allUp), 'retreadle-picks')
    expect(f.resolves).toBe(true)
    expect(unwovenThreads(f.draft as Draft).picks).toEqual([])
  })
})

describe('fixes for edges the weft doesn’t catch', () => {
  const d = defaultDraft()
  it('offers floating selvedges, which clear it without changing the draft', () => {
    expect(selvedgeMisses(d).length).toBeGreaterThan(0)
    const f = fix(selvedgeFixes(d, 'left'), 'floating-selvedge')
    expect(f).toMatchObject({ view: { floatingSelvedge: true }, resolves: true })
    expect(f.draft).toBeUndefined()
  })

  it('adds a selvedge end that catches the weft, leaving the pattern as it was', () => {
    const f = fix(selvedgeFixes(d, 'left'), 'selvedge-ends')
    const next = f.draft as Draft
    expect(selvedgeMisses(next).length).toBeLessThan(selvedgeMisses(d).length)
    expect(f.resolves).toBe(selvedgeMisses(next).length === 0)
    expect(next.ends).toBeGreaterThan(d.ends)
    expect(next.warpColors).toHaveLength(next.ends)
    // The original ends are all still there, in order, with the same drawdown.
    const offset = next.threading.findIndex((_, i) => next.threading.slice(i, i + d.ends).join() === d.threading.join())
    expect(offset).toBeGreaterThanOrEqual(0)
    const before = computeDrawdown(d)
    const after = computeDrawdown(next)
    expect(after.map((row) => row.slice(offset, offset + d.ends))).toEqual(before)
    expect(unwovenThreads(next).ends).toEqual([])
  })

  it('suggests starting from the other side only when that misses fewer turns', () => {
    for (const start of ['left', 'right'] as const) {
      const other = start === 'left' ? 'right' : 'left'
      const f = selvedgeFixes(d, start).find((x) => x.id === 'shuttle-start')
      if (selvedgeMisses(d, other).length < selvedgeMisses(d, start).length)
        expect(f?.view).toEqual({ shuttleStart: other })
      else expect(f).toBeUndefined()
    }
  })

  it('has nothing to fix when the edges catch', () => {
    // Plain weave catches at every turn.
    const plain: Draft = {
      ...d,
      treadling: d.treadling.map((_, p) => d.treadling[0].map((__, t) => t === (p % 2 ? 1 : 3))),
    }
    const tabby = {
      ...plain,
      tieup: d.tieup.map((row, s) => row.map((_, t) => (t === 1 ? s % 2 === 0 : t === 3 ? s % 2 === 1 : row[t]))),
    }
    expect(selvedgeMisses(tabby)).toEqual([])
    expect(selvedgeFixes(tabby, 'left')).toEqual([])
  })
})

describe('fixes for long floats', () => {
  const d = defaultDraft()
  // Untie treadle 1: its picks float right across.
  const loose = { ...d, tieup: d.tieup.map((row) => row.map((v, t) => (t === 0 ? false : v))) }

  it('shows them, or raises the limit to the longest', () => {
    const longest = Math.max(...Object.values(longestFloats(loose)))
    const fixes = floatFixes(loose, 7, false)
    expect(fix(fixes, 'highlight-floats').view).toEqual({ highlightFloats: true })
    expect(fix(fixes, 'allow-floats')).toMatchObject({ view: { floatLimit: longest }, resolves: true })
    expect(floatFixes(loose, 7, true).map((f) => f.id)).toEqual(['allow-floats'])
    expect(floatFixes(d, 7, false)).toEqual([])
  })
})
