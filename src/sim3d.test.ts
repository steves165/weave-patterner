import { describe, expect, it } from 'vitest'
import { doubleCloth } from './doublecloth'
import { fabricModel, shapePoint, THREAD } from './sim3d'
import { computeDrawdown, defaultDraft } from './weave'

const { bend, layerGap } = THREAD

describe('fabricModel', () => {
  it('makes one path per end and per pick, crossing at every intersection', () => {
    const m = fabricModel(defaultDraft(), 8, 6)
    expect([m.ends, m.picks, m.layered]).toEqual([8, 6, false])
    expect(m.paths.filter((p) => p.kind === 'warp')).toHaveLength(8)
    expect(m.paths.filter((p) => p.kind === 'weft')).toHaveLength(6)
    const warp = m.paths[0]
    expect(warp.points).toHaveLength(6 + 2) // one point per pick, plus a lead-in and lead-out
    expect(warp.color).toBe('#8b0a0a')
  })

  it('puts the thread on top higher than the one beneath it at every crossing', () => {
    const d = defaultDraft()
    const dd = computeDrawdown(d)
    const m = fabricModel(d, 8, 8)
    const warp = (e: number) => m.paths.find((p) => p.kind === 'warp' && p.index === e)
    const weft = (p: number) => m.paths.find((t) => t.kind === 'weft' && t.index === p)
    for (let p = 0; p < 8; p++)
      for (let e = 0; e < 8; e++) {
        const wz = warp(e)?.points[p + 1][2] ?? 0
        const fz = weft(p)?.points[e + 1][2] ?? 0
        expect(wz > fz).toBe(dd[p][e])
        expect(Math.abs(wz - fz)).toBeCloseTo(2 * bend)
      }
  })

  it('centres the cloth, with picks running down from the top', () => {
    const m = fabricModel(defaultDraft(), 4, 4)
    const xs = m.paths.filter((p) => p.kind === 'warp').map((p) => p.points[1][0])
    expect(xs).toEqual([-1.5, -0.5, 0.5, 1.5])
    const ys = m.paths.filter((p) => p.kind === 'weft').map((p) => p.points[1][1])
    expect(ys).toEqual([1.5, 0.5, -0.5, -1.5])
  })

  it('leaves out unthreaded ends and empty picks, and clamps to the draft size', () => {
    const d = defaultDraft()
    d.threading[1] = -1
    d.treadling[2] = [false, false, false, false]
    const m = fabricModel(d, 4, 4)
    expect(m.paths.filter((p) => p.kind === 'warp').map((p) => p.index)).toEqual([0, 2, 3])
    expect(m.paths.filter((p) => p.kind === 'weft').map((p) => p.index)).toEqual([0, 1, 3])
    expect(fabricModel(d, 999, 999).ends).toBe(32)
  })

  it('drops the lower layer of double cloth behind the upper one', () => {
    const d = doubleCloth({
      structure: 'separate',
      weave: 'plain',
      repeats: 4,
      warpA: '#000000',
      warpB: '#ffffff',
      weftA: '#000000',
      weftB: '#ffffff',
    })
    const m = fabricModel(d, 8, 8)
    expect(m.layered).toBe(true)
    const avgZ = (kind: 'warp' | 'weft', index: number) => {
      const pts = m.paths.find((p) => p.kind === kind && p.index === index)?.points.slice(1, -1) ?? []
      return pts.reduce((s, p) => s + p[2], 0) / pts.length
    }
    // Layer A ends (even) sit near the face; layer B ends (odd) about a layer gap behind.
    expect(avgZ('warp', 0)).toBeGreaterThan(avgZ('warp', 1) + layerGap / 2)
    expect(avgZ('weft', 0)).toBeGreaterThan(avgZ('weft', 1) + layerGap / 2)
  })
})

describe('shapePoint', () => {
  const W = 10
  const H = 10
  it('leaves flat cloth alone', () => {
    expect(shapePoint('flat', [1, 2, 0.3], W, H)).toEqual([1, 2, 0.3])
  })

  it('puffs a cushion in the middle and keeps its edges flat', () => {
    expect(shapePoint('cushion', [0, 0, 0], W, H)[2]).toBeCloseTo(5)
    expect(shapePoint('cushion', [W, 0, 0], W, H)[2]).toBeCloseTo(0)
    expect(shapePoint('cushion', [0, -H, 0], W, H)[2]).toBeCloseTo(0)
  })

  it('drapes in folds without moving the threads sideways', () => {
    const p = shapePoint('draped', [3, 4, 0], W, H)
    expect(p.slice(0, 2)).toEqual([3, 4])
    expect(p[2]).not.toBe(0)
  })

  it('rolls the bottom of the cloth up smoothly, keeping the top flat', () => {
    expect(shapePoint('rolled', [0, 5, 0.2], W, H)).toEqual([0, 5, 0.2])
    // Just below the start of the roll, barely moved; further down, curled up off the flat.
    const near = shapePoint('rolled', [0, -2.01, 0], W, H)
    expect(near[1]).toBeCloseTo(-2.01, 1)
    expect(near[2]).toBeCloseTo(0, 1)
    const radius = 8 / (1.7 * Math.PI) // the 8 units below the roll's start go round a little less than once
    const far = shapePoint('rolled', [0, -2 - Math.PI * radius, 0], W, H)
    expect(far[2]).toBeCloseTo(2 * radius, 5) // half way round
    // The very end hasn't come all the way round to overlap the cloth.
    const end = shapePoint('rolled', [0, -H, 0], W, H)
    expect(end[2]).toBeGreaterThan(0.5)
  })
})
