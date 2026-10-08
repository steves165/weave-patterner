import { beforeEach, describe, expect, it } from 'vitest'
import { calculate, defaultCalcInput } from './calculator'
import { loadYarns, saveYarns, yarnFor } from './yarns'

const store = new Map<string, string>()
beforeEach(() => {
  store.clear()
  globalThis.localStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
  } as Storage
})

describe('yarn library', () => {
  const navy = { id: 'a', name: 'Navy 8/2 cotton', color: '#1A237E', grist: 6000, price: 40 }

  it('saves and loads, dropping malformed entries', () => {
    saveYarns([navy])
    expect(loadYarns()).toEqual([navy])
    store.set('weave-yarns', JSON.stringify([navy, { name: 'no id' }, { id: 'b', name: 'bad colour', color: 'red' }]))
    expect(loadYarns()).toEqual([navy])
    store.set('weave-yarns', '{oops')
    expect(loadYarns()).toEqual([])
  })

  it('finds a yarn by thread colour, ignoring case', () => {
    expect(yarnFor([navy], '#1a237e')?.name).toBe('Navy 8/2 cotton')
    expect(yarnFor([navy], '#ffffff')).toBeUndefined()
  })

  it("feeds the calculator: a yarn's grist and price override the defaults for its colour", () => {
    const r = calculate({
      ...defaultCalcInput('metric'),
      ends: 100,
      warpColors: ['#1a237e'],
      weftColors: ['#ffffff'],
      yarnPerWeight: 1000,
      pricePerWeight: 10,
      yarnFor: (c) => yarnFor([navy], c),
    })
    expect(r.warp[0]).toMatchObject({ yarn: 'Navy 8/2 cotton' })
    expect(r.warp[0].weight).toBeCloseTo(r.warp[0].length / 6000)
    expect(r.warp[0].cost).toBeCloseTo((r.warp[0].length / 6000) * 40)
    expect(r.weft[0].yarn).toBeUndefined()
    expect(r.weft[0].weight).toBeCloseTo(r.weft[0].length / 1000)
  })

  it('leaves the total weight undefined when some colours have no grist', () => {
    const r = calculate({
      ...defaultCalcInput('metric'),
      ends: 100,
      warpColors: ['#1a237e'],
      weftColors: ['#ffffff'],
      yarnFor: (c) => yarnFor([navy], c),
    })
    expect(r.warp[0].weight).toBeDefined()
    expect(r.weft[0].weight).toBeUndefined()
    expect(r.totalWeight).toBeUndefined()
  })
})
