import { describe, expect, it } from 'vitest'
import { isTexture, TEXTURES, thickness } from './textures'

const sample = (texture: Parameters<typeof thickness>[0], seed = 1) =>
  Array.from({ length: 200 }, (_, i) => thickness(texture, seed, i / 10, (i % 7) / 7))

describe('yarn textures', () => {
  it('keeps smooth and silk yarns even', () => {
    expect(new Set(sample('smooth'))).toEqual(new Set([1]))
    expect(new Set(sample('silk'))).toEqual(new Set([1]))
  })

  it('varies slub, bouclé and wool within sensible limits, repeatably', () => {
    for (const t of ['slub', 'boucle', 'wool'] as const) {
      const s = sample(t)
      expect(Math.min(...s)).toBeGreaterThan(0.75)
      expect(Math.max(...s)).toBeLessThan(1.4)
      expect(Math.max(...s) - Math.min(...s)).toBeGreaterThan(0.05)
      expect(sample(t)).toEqual(s)
      expect(sample(t, 2)).not.toEqual(s)
    }
  })

  it('makes bouclé lumpier than slub over a short stretch', () => {
    const changes = (s: number[]) => s.slice(1).reduce((n, v, i) => n + Math.abs(v - s[i]), 0)
    expect(changes(sample('boucle'))).toBeGreaterThan(changes(sample('slub')))
  })

  it('makes silk glossier than wool', () => {
    expect(TEXTURES.silk.roughness).toBeLessThan(TEXTURES.wool.roughness)
    expect(isTexture('silk')).toBe(true)
    expect(isTexture('velvet')).toBe(false)
  })
})
