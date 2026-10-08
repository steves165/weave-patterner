import { beforeEach, describe, expect, it } from 'vitest'
import { fabricModel } from './sim3d'
import { defaultDraft } from './weave'
import { clothLook, DEFAULT_SIZE, loadDensity, yarnDiameter } from './yarnGeometry'

describe('yarnDiameter', () => {
  it('gives finer yarns smaller diameters', () => {
    const thick = yarnDiameter(1000, 'metric')
    const thin = yarnDiameter(4000, 'metric')
    expect(thick).toBeCloseTo(2 * thin) // four times the length per kg: half the diameter
    expect(yarnDiameter(10000, 'metric')).toBeGreaterThan(0.3)
    expect(yarnDiameter(10000, 'metric')).toBeLessThan(0.7)
  })

  it('converts yards per pound', () => {
    // 1 yd/lb is 2.0159 m/kg.
    expect(yarnDiameter(1000, 'imperial')).toBeCloseTo(yarnDiameter(2015.9, 'metric'), 3)
  })
})

describe('clothLook', () => {
  const d = defaultDraft() // red warp, white weft
  const yarns = [
    { id: 'a', name: 'Red wool', color: '#8b0a0a', grist: 1000 },
    { id: 'b', name: 'White, no grist', color: '#ffffff' },
  ]

  it('sizes each thread from its yarn, relative to the end spacing', () => {
    const look = clothLook(d, yarns, { units: 'metric', sett: 5, ppi: 5 })
    expect(look.fromYarns).toBe(true)
    expect(look.warpTexture[0]).toBe('smooth')
    // 5 ends per cm: 2 mm apart.
    expect(look.warpSize[0]).toBeCloseTo(yarnDiameter(1000, 'metric') / 2)
    expect(look.weftSize[0]).toBe(DEFAULT_SIZE)
    expect(look.pickSpacing).toBe(1)
  })

  it('spaces picks by the picks per cm against the sett', () => {
    expect(clothLook(d, [], { units: 'metric', sett: 10, ppi: 5 }).pickSpacing).toBe(2)
    expect(clothLook(d, [], { units: 'metric', sett: 10, ppi: 5 }).fromYarns).toBe(false)
  })

  it('makes thicker threads and wider-spaced picks in the 3D model', () => {
    const look = clothLook(d, yarns, { units: 'metric', sett: 5, ppi: 2.5 })
    const m = fabricModel(d, 4, 4, undefined, look)
    const warp = m.paths.find((p) => p.kind === 'warp')
    const weft = m.paths.find((p) => p.kind === 'weft')
    expect(warp?.radius).toBeCloseTo(look.warpSize[0] / 2)
    expect(weft?.radius).toBe(0.5)
    const ys = m.paths.filter((p) => p.kind === 'weft').map((p) => p.points[1][1])
    expect(ys[0] - ys[1]).toBeCloseTo(2)
  })
})

describe('loadDensity', () => {
  const store = new Map<string, string>()
  beforeEach(() => {
    store.clear()
    globalThis.localStorage = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
    } as Storage
  })

  it("uses the calculator's saved sett and picks, or its defaults", () => {
    expect(loadDensity()).toEqual({ units: 'metric', sett: 8, ppi: 8 })
    store.set('weave-calculator', JSON.stringify({ units: 'imperial', texts: { sett: '24', ppi: 'x' } }))
    expect(loadDensity()).toEqual({ units: 'imperial', sett: 24, ppi: 20 })
  })
})
