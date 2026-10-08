import { describe, expect, it } from 'vitest'
import { garmentGeometry } from './mockups'

describe('garment shapes', () => {
  it('measures the cloth in cm, round the garment and down it, so the pattern keeps its real size', () => {
    const g = garmentGeometry(
      [
        { y: 100, rx: 10, rz: 10 },
        { y: 50, rx: 10, rz: 10 },
      ],
      0,
      1,
      64,
      4,
    )
    const uv = g.attributes.uv
    const ring = 65
    // Round a 10 cm radius, measured either way from the centre front: about 2π × 10 cm in all.
    expect(uv.getX(ring - 1) - uv.getX(0)).toBeCloseTo(2 * Math.PI * 10, 0)
    expect(uv.getX(32)).toBeCloseTo(0, 5)
    // Down the 50 cm of a straight tube.
    expect(uv.getY(uv.count - 1)).toBeCloseTo(-50, 5)
  })

  it('cuts it in panels, each with the warp running straight down its middle', () => {
    const g = garmentGeometry(
      [
        { y: 100, rx: 12, rz: 12 },
        { y: 40, rx: 30, rz: 30 },
      ],
      0,
      8,
      96,
      4,
    )
    const uv = g.attributes.uv
    const rowsPerPanel = 5
    const w = 13
    // Every panel's centre line is at 0 across, at the waist and the hem alike: the columns don't drift.
    for (let k = 0; k < 8; k++)
      for (const i of [0, rowsPerPanel - 1]) expect(uv.getX(k * rowsPerPanel * w + i * w + 6)).toBeCloseTo(0, 5)
  })

  it('ripples a full skirt into folds, deeper towards the hem', () => {
    const g = garmentGeometry(
      [
        { y: 100, rx: 14, rz: 14, fold: 0 },
        { y: 40, rx: 30, rz: 30, fold: 3 },
      ],
      10,
      1,
      80,
      6,
    )
    const pos = g.attributes.position
    const radii = (row: number) =>
      Array.from({ length: 80 }, (_, j) => Math.hypot(pos.getX(row * 81 + j), pos.getZ(row * 81 + j)))
    const spread = (r: number[]) => Math.max(...r) - Math.min(...r)
    expect(spread(radii(0))).toBeLessThan(0.01)
    expect(spread(radii(6))).toBeCloseTo(6, 0)
  })
})
