import { inflateSync } from 'node:zlib'
import { describe, expect, it } from 'vitest'
import { defaultDraft } from '../src/weave'
import { encodePng, renderDraftPng } from './png'

/** Minimal PNG reader for 8-bit RGB, filter-0 images (what encodePng writes). */
function decode(png: Buffer) {
  expect(png.subarray(0, 8)).toEqual(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  const width = png.readUInt32BE(16)
  const height = png.readUInt32BE(20)
  const idatLen = png.readUInt32BE(33)
  expect(png.toString('ascii', 37, 41)).toBe('IDAT')
  const raw = inflateSync(png.subarray(41, 41 + idatLen))
  const pixel = (x: number, y: number) => [
    ...raw.subarray(y * (width * 3 + 1) + 1 + x * 3, y * (width * 3 + 1) + 4 + x * 3),
  ]
  return { width, height, pixel }
}

describe('encodePng', () => {
  it('encodes pixels that decode back', () => {
    const rgb = new Uint8Array([255, 0, 0, 0, 255, 0, 0, 0, 255, 10, 20, 30])
    const { width, height, pixel } = decode(encodePng(2, 2, rgb))
    expect([width, height]).toEqual([2, 2])
    expect(pixel(1, 0)).toEqual([0, 255, 0])
    expect(pixel(1, 1)).toEqual([10, 20, 30])
  })
})

describe('renderDraftPng', () => {
  it('draws the drawdown in the warp and weft colours', () => {
    const d = defaultDraft() // pick 1, end 1 is warp-up (dark red); end 3 is weft-up (white)
    const cell = 6
    const { width, pixel } = decode(renderDraftPng(d, cell))
    expect(width).toBeGreaterThan(d.ends * (cell + 1))
    const pitch = cell + 1
    const yDraw = cell + pitch + 1 + cell + d.shafts * pitch + 1 + cell * 2 // matches renderDraftPng's layout
    const centre = (e: number, p: number) => pixel(cell + 1 + e * pitch + 2, yDraw + 1 + p * pitch + 2)
    expect(centre(0, 0)).toEqual([0x8b, 0x0a, 0x0a])
    expect(centre(2, 0)).toEqual([255, 255, 255])
  })
})
