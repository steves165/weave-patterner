import { describe, expect, it } from 'vitest'
import { encodeBmp, indexColors } from './bmp'

const header = (b: Uint8Array) => {
  const v = new DataView(b.buffer)
  return {
    magic: String.fromCharCode(b[0], b[1]),
    size: v.getUint32(2, true),
    offset: v.getUint32(10, true),
    width: v.getInt32(18, true),
    height: v.getInt32(22, true),
    bits: v.getUint16(28, true),
    colors: v.getUint32(46, true),
  }
}

describe('bitmaps', () => {
  it('writes black and white as 1 bit per pixel, bottom row first, rows padded to 4 bytes', () => {
    // Top row: black, white, black; bottom row: white, white, black.
    const b = encodeBmp(
      [
        [1, 0, 1],
        [0, 0, 1],
      ],
      ['#ffffff', '#000000'],
    )
    const h = header(b)
    expect(h).toMatchObject({ magic: 'BM', width: 3, height: 2, bits: 1, colors: 2, offset: 62 })
    expect(h.size).toBe(b.length)
    expect(b.length).toBe(62 + 2 * 4)
    // Palette: white then black (blue, green, red, 0).
    expect([...b.slice(54, 62)]).toEqual([255, 255, 255, 0, 0, 0, 0, 0])
    expect(b[62]).toBe(0b0010_0000) // the bottom row first
    expect(b[66]).toBe(0b1010_0000)
  })

  it('writes up to 256 colours as 8-bit indices, keeping the palette order', () => {
    const b = encodeBmp([[0, 1, 2, 2, 1]], ['#f2ead8', '#2e5e8c', '#c62828'])
    expect(header(b)).toMatchObject({ width: 5, height: 1, bits: 8, colors: 256, offset: 54 + 1024 })
    expect([...b.slice(54, 58)]).toEqual([0xd8, 0xea, 0xf2, 0])
    expect([...b.slice(1078, 1083)]).toEqual([0, 1, 2, 2, 1])
    expect(b.length).toBe(1078 + 8)
  })

  it('writes more colours than that as 24-bit colour', () => {
    const palette = Array.from({ length: 300 }, (_, i) => `#${i.toString(16).padStart(6, '0')}`)
    const b = encodeBmp([[299, 1]], palette)
    expect(header(b)).toMatchObject({ bits: 24, colors: 0, offset: 54 })
    expect([...b.slice(54, 60)]).toEqual([0x2b, 0x01, 0, 1, 0, 0])
  })

  it('numbers colours in order of first use', () => {
    expect(
      indexColors([
        ['#FF0000', '#00ff00'],
        ['#ff0000', '#0000ff'],
      ]),
    ).toEqual({
      pixels: [
        [0, 1],
        [0, 2],
      ],
      palette: ['#ff0000', '#00ff00', '#0000ff'],
    })
  })

  it('refuses an empty picture', () => {
    expect(() => encodeBmp([], ['#000000'])).toThrow()
  })
})

describe('draft bitmaps', () => {
  it('are one pixel per crossing, black where the warp is up, mirrored when end 1 is on the right', async () => {
    const { draftBitmap } = await import('./exportDraft')
    const { computeDrawdown, defaultDraft } = await import('./weave')
    const d = defaultDraft()
    const dd = computeDrawdown(d)
    const b = draftBitmap(d, 'structure')
    const v = new DataView(b.buffer)
    expect([v.getInt32(18, true), v.getInt32(22, true), v.getUint16(28, true)]).toEqual([32, 32, 1])
    // The top row (pick 1) is stored last.
    const top = 62 + 31 * 4
    const bit = (bytes: Uint8Array, x: number) => (bytes[top + (x >> 3)] >> (7 - (x & 7))) & 1
    for (let x = 0; x < 32; x++) expect(bit(b, x)).toBe(dd[0][x] ? 1 : 0)
    const mirrored = draftBitmap(d, 'structure', true)
    for (let x = 0; x < 32; x++) expect(bit(mirrored, x)).toBe(dd[0][31 - x] ? 1 : 0)
    // In colour: the warp and weft colours make the palette.
    const c = draftBitmap(d, 'colors')
    expect(new DataView(c.buffer).getUint16(28, true)).toBe(1)
  })
})
