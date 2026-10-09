/**
 * Windows bitmaps (.bmp), one pixel per square: what jacquard looms (TC2 and the like) and machine-knitting software
 * (AYAB, img2track) read. With a palette of up to 2 colours the file is 1 bit per pixel, up to 256 colours 8 bits
 * (indexed), and more than that 24-bit colour.
 */

const rgb = (hex: string): [number, number, number] => {
  const n = Number.parseInt(hex.replace('#', '').slice(0, 6), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

/**
 * Encodes an image given as palette indices, row by row from the top. `palette` holds #rrggbb colours; index i of
 * the palette is index i in the file, so the colours keep their order (colour A first, and so on).
 */
export function encodeBmp(pixels: number[][], palette: string[]): Uint8Array<ArrayBuffer> {
  const height = pixels.length
  const width = pixels[0]?.length ?? 0
  if (!width || !height) throw new Error('The picture is empty')
  const bits = palette.length <= 2 ? 1 : palette.length <= 256 ? 8 : 24
  const colors = bits === 24 ? 0 : 2 ** bits
  // Each row is padded to a multiple of 4 bytes.
  const rowBytes = Math.ceil((width * bits) / 32) * 4
  const offset = 14 + 40 + colors * 4
  const size = offset + rowBytes * height
  const out = new Uint8Array(size)
  const view = new DataView(out.buffer)
  // File header
  out[0] = 0x42 // B
  out[1] = 0x4d // M
  view.setUint32(2, size, true)
  view.setUint32(10, offset, true)
  // BITMAPINFOHEADER: positive height means rows are stored bottom first.
  view.setUint32(14, 40, true)
  view.setInt32(18, width, true)
  view.setInt32(22, height, true)
  view.setUint16(26, 1, true)
  view.setUint16(28, bits, true)
  view.setUint32(30, 0, true)
  view.setUint32(34, rowBytes * height, true)
  view.setInt32(38, 2835, true) // 72 dpi
  view.setInt32(42, 2835, true)
  view.setUint32(46, colors, true)
  view.setUint32(50, 0, true)
  // The palette, as blue, green, red, 0; unused entries stay black.
  if (colors)
    palette.forEach((hex, i) => {
      const [r, g, b] = rgb(hex)
      out.set([b, g, r, 0], 54 + i * 4)
    })
  const solid = palette.map(rgb)
  for (let y = 0; y < height; y++) {
    const row = pixels[height - 1 - y]
    const at = offset + y * rowBytes
    for (let x = 0; x < width; x++) {
      const i = row[x] ?? 0
      if (bits === 1) {
        if (i) out[at + (x >> 3)] |= 0x80 >> (x & 7)
      } else if (bits === 8) out[at + x] = i
      else {
        const [r, g, b] = solid[i] ?? [0, 0, 0]
        out.set([b, g, r], at + x * 3)
      }
    }
  }
  return out
}

/** Turns a picture given as colours into palette indices and the palette, in order of first use. */
export function indexColors(colors: string[][]): { pixels: number[][]; palette: string[] } {
  const palette: string[] = []
  const pixels = colors.map((row) =>
    row.map((c) => {
      const hex = c.toLowerCase()
      let i = palette.indexOf(hex)
      if (i < 0) i = palette.push(hex) - 1
      return i
    }),
  )
  return { pixels, palette }
}
