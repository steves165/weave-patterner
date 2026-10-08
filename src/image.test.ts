import { describe, expect, it } from 'vitest'
import { lightnessGrid, mainColors, midLightness, type Pixels, pictureProfile, twoTone } from './image'

/** A tiny image: dark (#000) where `dark(x, y)` is true, white elsewhere. */
function image(width: number, height: number, dark: (x: number, y: number) => boolean): Pixels {
  const data: number[] = []
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const v = dark(x, y) ? 0 : 255
      data.push(v, v, v, 255)
    }
  return { data, width, height }
}

describe('picture to profile', () => {
  it('averages the picture into cells and splits it at a threshold', () => {
    const px = image(8, 8, (x) => x < 4)
    const grid = lightnessGrid(px, 4, 2)
    expect(grid[0].map((v) => Math.round(v * 1000) / 1000)).toEqual([0, 0, 1, 1])
    expect(twoTone(grid, 0.5)).toEqual([
      [true, true, false, false],
      [true, true, false, false],
    ])
    expect(midLightness(grid)).toBeCloseTo(0.5)
    // Mostly dark still splits in two.
    expect(midLightness([[0, 0, 0, 0.9]])).toBeCloseTo(0.45)
  })

  it('turns a picture into blocks: alike columns share a block, alike rows a block treadle', () => {
    // A cross: dark in the middle column band and the middle row band.
    const pic = Array.from({ length: 6 }, (_, r) =>
      Array.from({ length: 6 }, (_, c) => r === 2 || r === 3 || c === 2 || c === 3),
    )
    const { profile, match } = pictureProfile(pic, 4, 4)
    expect(match).toBe(1)
    expect(profile.threading).toEqual([1, 1, 2, 2, 1, 1])
    expect(profile.treadling).toEqual([1, 1, 2, 2, 1, 1])
    expect(profile.tieup).toEqual([
      [false, true],
      [true, true],
    ])
  })

  it('merges the most alike columns when there are too many to be blocks', () => {
    // A diagonal: every column different.
    const pic = Array.from({ length: 8 }, (_, r) => Array.from({ length: 8 }, (_, c) => r === c))
    const { profile, match } = pictureProfile(pic, 4, 4)
    expect(new Set(profile.threading).size).toBeLessThanOrEqual(4)
    expect(new Set(profile.treadling).size).toBeLessThanOrEqual(4)
    expect(match).toBeGreaterThan(0.6)
    expect(match).toBeLessThan(1)
  })
})

describe('mainColors', () => {
  it('finds the main colours, dark to light', () => {
    const data: number[] = []
    for (let i = 0; i < 100; i++) data.push(...(i < 60 ? [200, 20, 20, 255] : [240, 240, 230, 255]))
    expect(mainColors({ data, width: 10, height: 10 }, 2)).toEqual(['#c81414', '#f0f0e6'])
    expect(mainColors({ data, width: 10, height: 10 }, 1)).toHaveLength(1)
  })
})
