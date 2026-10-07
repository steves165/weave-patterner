import { deflateSync } from 'node:zlib'
import { computeDrawdown, type Draft } from '../src/weave'

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})

const crc32 = (buf: Buffer) => {
  let c = 0xffffffff
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

const chunk = (type: string, data: Buffer) => {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([len, body, crc])
}

/** Encodes an RGB pixel buffer (3 bytes per pixel, row-major) as a PNG. */
export function encodePng(width: number, height: number, rgb: Uint8Array): Buffer {
  const raw = Buffer.alloc((width * 3 + 1) * height)
  for (let y = 0; y < height; y++) {
    raw[y * (width * 3 + 1)] = 0 // filter: none
    Buffer.from(rgb.buffer, rgb.byteOffset + y * width * 3, width * 3).copy(raw, y * (width * 3 + 1) + 1)
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr.set([8, 2, 0, 0, 0], 8) // 8-bit, truecolour, default compression/filter/interlace
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

const parseHex = (c: string): [number, number, number] =>
  [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16)) as [number, number, number]

/** Renders the full draft (threading, tie-up, treadling, colour strips and drawdown) like the app's layout. */
export function renderDraftPng(d: Draft, cell = 6): Buffer {
  const { shafts, treadles, ends, picks } = d
  const pitch = cell + 1
  const gap = cell * 2
  const pad = cell
  const xTie = pad + ends * pitch + 1 + gap
  const xWeft = xTie + treadles * pitch + 1 + gap
  const yThread = pad + pitch + 1 + gap / 2
  const yDraw = yThread + shafts * pitch + 1 + gap
  const width = xWeft + pitch + 1 + pad
  const height = yDraw + picks * pitch + 1 + pad

  const px = new Uint8Array(width * height * 3).fill(255)
  const fill = (x: number, y: number, w: number, h: number, [r, g, b]: [number, number, number]) => {
    for (let yy = y; yy < y + h; yy++)
      for (let xx = x; xx < x + w; xx++) {
        const i = (yy * width + xx) * 3
        px[i] = r
        px[i + 1] = g
        px[i + 2] = b
      }
  }
  // A grid at (x, y): line-coloured background with each cell filled by colorAt.
  const grid = (
    x: number,
    y: number,
    cols: number,
    rows: number,
    colorAt: (c: number, r: number) => string,
    line = '#a0a0a0',
  ) => {
    fill(x, y, cols * pitch + 1, rows * pitch + 1, parseHex(line))
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++) fill(x + 1 + c * pitch, y + 1 + r * pitch, cell, cell, parseHex(colorAt(c, r)))
  }

  const dd = computeDrawdown(d)
  const shaftAt = (r: number) => shafts - 1 - r // shaft 1 drawn at the bottom
  grid(pad, pad, ends, 1, (e) => d.warpColors[e], '#606060')
  grid(pad, yThread, ends, shafts, (e, r) => (d.threading[e] === shaftAt(r) ? '#111111' : '#ffffff'))
  grid(xTie, yThread, treadles, shafts, (t, r) => (d.tieup[shaftAt(r)][t] ? '#111111' : '#ffffff'))
  grid(pad, yDraw, ends, picks, (e, p) => (dd[p][e] ? d.warpColors[e] : d.weftColors[p]), '#606060')
  grid(xTie, yDraw, treadles, picks, (t, p) => (d.treadling[p][t] ? '#111111' : '#ffffff'))
  grid(xWeft, yDraw, 1, picks, (_, p) => d.weftColors[p], '#606060')
  return encodePng(width, height, px)
}
