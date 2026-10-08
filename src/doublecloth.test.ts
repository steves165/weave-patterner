import { describe, expect, it } from 'vitest'
import { type DoubleClothOptions, doubleCloth } from './doublecloth'
import { clothView, isLayered, layerMap, pickLayers } from './layers'
import { layerNote } from './trace'
import { computeDrawdown, defaultDraft } from './weave'

const COLORS = { warpA: '#000000', warpB: '#ffffff', weftA: '#111111', weftB: '#eeeeee' }
const opts = (o: Partial<DoubleClothOptions>): DoubleClothOptions => ({
  structure: 'separate',
  weave: 'plain',
  repeats: 4,
  ...COLORS,
  ...o,
})
const isA = (c: string) => c === '#000000' || c === '#111111'

describe('doubleCloth', () => {
  it('makes double plain weave on 4 shafts and 4 treadles', () => {
    const d = doubleCloth(opts({}))
    expect([d.shafts, d.treadles, d.ends, d.picks]).toEqual([4, 4, 16, 16])
    expect(d.threading.slice(0, 4)).toEqual([0, 2, 1, 3]) // A on 1–2, B on 3–4, alternating
    expect(d.warpColors.slice(0, 2)).toEqual(['#000000', '#ffffff'])
    expect(d.weftColors.slice(0, 2)).toEqual(['#111111', '#eeeeee'])
  })

  it('weaves each layer as plain weave, with the top layer lifted for every bottom pick', () => {
    const d = doubleCloth(opts({}))
    const dd = computeDrawdown(d)
    const aEnds = [0, 2, 4, 6]
    const bEnds = [1, 3, 5, 7]
    const aPicks = [0, 2, 4, 6]
    const bPicks = [1, 3, 5, 7]
    const sub = (ps: number[], es: number[]) => ps.map((p) => es.map((e) => (dd[p][e] ? '#' : '.')).join(''))
    expect(sub(aPicks, aEnds)).toEqual(['#.#.', '.#.#', '#.#.', '.#.#'])
    expect(sub(bPicks, bEnds)).toEqual(['#.#.', '.#.#', '#.#.', '.#.#'])
    expect(sub(bPicks, aEnds).every((r) => r === '####')).toBe(true) // A always over B's weft
    expect(sub(aPicks, bEnds).every((r) => r === '....')).toBe(true) // B always under A's weft
  })

  it('uses 8 shafts for double 2/2 twill', () => {
    const d = doubleCloth(opts({ weave: 'twill', repeats: 2 }))
    expect([d.shafts, d.treadles, d.ends, d.picks]).toEqual([8, 8, 16, 16])
  })

  it('uses one weft colour for a tube, and top-bottom-bottom-top for double width', () => {
    expect(new Set(doubleCloth(opts({ structure: 'tubular' })).weftColors)).toEqual(new Set(['#111111']))
    const wide = doubleCloth(opts({ structure: 'double-width' }))
    expect(new Set(wide.weftColors).size).toBe(1)
    // Treadles go A, B per pick index: picks run A0 B0 B1 A1.
    const layerOf = (p: number) => wide.treadling[p].findIndex(Boolean) % 2
    expect([0, 1, 2, 3, 4, 5, 6, 7].map(layerOf)).toEqual([0, 1, 1, 0, 0, 1, 1, 0])
  })

  it('stitches the layers together on every few repeats', () => {
    const d = doubleCloth(opts({ structure: 'stitched', repeats: 4, stitchEvery: 2 }))
    expect([d.shafts, d.treadles, d.ends, d.picks]).toEqual([4, 6, 16, 16])
    const dd = computeDrawdown(d)
    // Layer-A ends go under some layer-B picks only in the stitching repeats (picks 5–8 and 13–16).
    const dips = (p: number) => [0, 2, 4, 6, 8, 10, 12, 14].filter((e) => !dd[p][e]).length
    expect([1, 3, 5, 7, 9, 11, 13, 15].map(dips)).toEqual([0, 0, 4, 4, 0, 0, 4, 4])
    // Each stitch is under the layer-A weft on the pick before, so it barely shows on the face.
    const face = clothView(d, 'face').flat()
    expect(face.filter((s) => isA(s.color)).length / face.length).toBeGreaterThan(0.85)
    expect(() => doubleCloth(opts({ structure: 'stitched', stitchEvery: 0 }))).toThrow(/at least every repeat/)
  })

  it('swaps layers by block, following the profile', () => {
    const d = doubleCloth(
      opts({
        structure: 'blocks',
        profile: {
          threading: [1, 1, 2, 2],
          treadling: [1, 1, 2, 2],
          tieup: [
            [true, false],
            [false, true],
          ],
        },
      }),
    )
    expect([d.shafts, d.treadles, d.ends, d.picks]).toEqual([8, 8, 16, 16])
    const face = clothView(d, 'face')
    const back = clothView(d, 'back')
    // Block 1 × treadle 1 and block 2 × treadle 2: A on the face. The others: B on the face. Reversed on the back.
    const quadrant = (v: typeof face, p0: number, e0: number) =>
      v.slice(p0 + 2, p0 + 6).flatMap((row) => row.slice(e0 + 2, e0 + 6).map((s) => isA(s.color)))
    expect(quadrant(face, 0, 0).every(Boolean)).toBe(true)
    expect(quadrant(face, 0, 8).some(Boolean)).toBe(false)
    expect(quadrant(face, 8, 8).every(Boolean)).toBe(true)
    expect(quadrant(back, 0, 0).some(Boolean)).toBe(false)
    expect(quadrant(back, 0, 8).every(Boolean)).toBe(true)
  })

  it.each(['plain', 'twill'] as const)('shows the right layer on each side almost everywhere in %s blocks', (weave) => {
    // Narrow blocks (one unit) make this hard: layers swap every few threads.
    const units = [1, 2, 2, 1, 1, 2, 1, 2]
    const tieup = [
      [true, false],
      [false, true],
    ]
    const d = doubleCloth(opts({ structure: 'blocks', weave, profile: { threading: units, treadling: units, tieup } }))
    const unit = weave === 'plain' ? 4 : 8
    const aOnTop = (p: number, e: number) => tieup[units[Math.floor(e / unit)] - 1][units[Math.floor(p / unit)] - 1]
    for (const side of ['face', 'back'] as const) {
      const view = clothView(d, side)
      let right = 0
      view.forEach((row, p) => {
        row.forEach((s, e) => {
          if (isA(s.color) === (aOnTop(p, e) === (side === 'face'))) right++
        })
      })
      expect(right / (d.ends * d.picks)).toBeGreaterThan(0.85)
    }
  })

  it.each([
    [
      opts({
        structure: 'blocks',
        weave: 'twill',
        profile: { threading: [1], treadling: [1], tieup: Array.from({ length: 17 }, () => [true]) },
      }),
      /needs 136 shafts/,
    ],
    [opts({ structure: 'blocks', profile: { threading: [3], treadling: [1], tieup: [[true]] } }), /Block 3 isn't/],
    [opts({ repeats: 0 }), /at least one repeat/],
    [opts({ repeats: 101 }), /limit is 400/],
  ])('rejects impossible requests %#', (o, message) => {
    expect(() => doubleCloth(o)).toThrow(message)
  })
})

describe('clothView', () => {
  it('matches the drawdown for single-layer cloth, and turns it over for the back', () => {
    const d = defaultDraft()
    const dd = computeDrawdown(d)
    expect(clothView(d, 'face').map((r) => r.map((s) => s.warp))).toEqual(dd)
    expect(clothView(d, 'back').map((r) => r.map((s) => s.warp))).toEqual(dd.map((r) => r.map((v) => !v)))
    expect(clothView(d, 'face')[0][0].color).toBe(d.warpColors[0])
  })

  it.each(['separate', 'tubular', 'double-width'] as const)(
    'shows only layer A on the face of %s double cloth',
    (structure) => {
      for (const weave of ['plain', 'twill'] as const) {
        const d = doubleCloth(opts({ structure, weave, repeats: 4 }))
        const face = clothView(d, 'face').flat()
        expect(face.every((s) => isA(s.color))).toBe(true)
        // The back shows layer B's warp; one shuttle means its weft is A's colour in a tube or double width.
        const back = clothView(d, 'back').flat()
        expect(back.filter((s) => s.warp).every((s) => s.color === '#ffffff')).toBe(true)
      }
    },
  )

  it('leaves a lift plan or partly layered draft readable', () => {
    const d = doubleCloth(opts({}))
    expect(clothView(d, 'face')).toHaveLength(d.picks)
    expect(clothView(d, 'face')[0]).toHaveLength(d.ends)
  })
})

describe('pickLayers and layerNote', () => {
  const both = (d: ReturnType<typeof doubleCloth>) => ({ face: layerMap(d, 'face'), back: layerMap(d, 'back') })

  it('labels each pick of separate layers top or bottom, and nothing for single cloth', () => {
    const d = doubleCloth(opts({}))
    const { face, back } = both(d)
    expect(pickLayers(face, back).slice(0, 4)).toEqual(['top', 'bottom', 'top', 'bottom'])
    const single = both(defaultDraft())
    expect(new Set(pickLayers(single.face, single.back))).toEqual(new Set([null]))
    expect(isLayered(face, back)).toBe(true)
    expect(isLayered(single.face, single.back)).toBe(false)
  })

  it('says the layers swap across the width in block double cloth', () => {
    const d = doubleCloth(
      opts({
        structure: 'blocks',
        profile: {
          threading: [1, 1, 2, 2],
          treadling: [1, 1],
          tieup: [[true], [false]],
        },
      }),
    )
    const { face, back } = both(d)
    expect(pickLayers(face, back).slice(0, 4)).toEqual(['both', 'both', 'both', 'both'])
  })

  it('notes where a crossing is hidden', () => {
    const d = doubleCloth(opts({}))
    const layers = both(d)
    // End 2 (layer B) on pick 2 (layer B): under layer A on the face.
    expect(layerNote(layers, 1, 1)).toMatch(/both in the lower layer here, so this crossing is hidden on the face/)
    // End 1 (A) on pick 1 (A): hidden on the back.
    expect(layerNote(layers, 0, 0)).toMatch(/hidden on the back/)
    // End 1 (A) on pick 2 (B): A's end passes over B's weft between the layers; no note.
    expect(layerNote(layers, 0, 1)).toBeNull()
    expect(layerNote(both(defaultDraft()), 0, 0)).toBeNull()
  })
})
