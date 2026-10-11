import { createCanvas } from '@napi-rs/canvas'
import { describe, expect, it } from 'vitest'
import { computeDrawdown } from '../weave'
import { homography, invert, project } from './homography'
import {
  cellCentre,
  decodeSpec,
  encodeSpec,
  type SheetSpec,
  sheetLayout,
  warpStripCentre,
  weftStripCentre,
} from './layout'
import { canvasPainter, drawSheet } from './render'
import { deltaE, type Picture, type RGB, readSheet } from './scan'
import { draftFromScan } from './toDraft'

/** Pixels to the millimetre of the "printed" sheet. */
const K = 6

const rgb = (hex: string): RGB => [1, 3, 5].map((i) => Number.parseInt(hex.slice(i, i + 2), 16)) as RGB

interface Filling {
  /** The colour inked in grid square (row, col), or null to leave it blank. */
  cell: (row: number, col: number) => string | null
  warp?: (col: number) => string | null
  weft?: (row: number) => string | null
}

/** A sheet as printed, then coloured in like a felt-tip pen (most of each square, a little ragged). */
function filledSheet(spec: SheetSpec, fill: Filling): Picture {
  const l = sheetLayout(spec)
  const canvas = createCanvas(Math.round(l.page.w * K), Math.round(l.page.h * K))
  const ctx = canvas.getContext('2d') as unknown as CanvasRenderingContext2D
  drawSheet(canvasPainter(ctx, K), l)
  const ink = (centre: { x: number; y: number }, colour: string | null | undefined, seed: number) => {
    if (!colour) return
    const s = l.grid.cell * (0.72 + ((seed * 37) % 10) / 100)
    ctx.fillStyle = colour
    ctx.fillRect((centre.x - s / 2) * K, (centre.y - s / 2) * K, s * K, s * K)
  }
  for (let r = 0; r < spec.picks; r++)
    for (let c = 0; c < spec.ends; c++) ink(cellCentre(l, r, c), fill.cell(r, c), r * 31 + c)
  for (let c = 0; c < spec.ends; c++) ink(warpStripCentre(l, c), fill.warp?.(c), c)
  for (let r = 0; r < spec.picks; r++) ink(weftStripCentre(l, r), fill.weft?.(r), r)
  const img = ctx.getImageData(0, 0, canvas.width, canvas.height)
  return { data: img.data, width: img.width, height: img.height }
}

/**
 * The sheet photographed: seen at an angle (the page's corners land on `quad`), on a grey table, lit unevenly (darker
 * to one side) and with a little noise, in a `w` × `h` picture.
 */
function photograph(sheet: Picture, quad: { x: number; y: number }[], w: number, h: number, seed = 1): Picture {
  const corners = [
    { x: 0, y: 0 },
    { x: sheet.width, y: 0 },
    { x: sheet.width, y: sheet.height },
    { x: 0, y: sheet.height },
  ]
  const toPhoto = homography(corners, quad)
  if (!toPhoto) throw new Error('bad quad')
  const back = invert(toPhoto)
  const data = new Uint8ClampedArray(w * h * 4)
  let n = seed
  const noise = () => {
    n = (n * 1103515245 + 12345) % 2147483648
    return ((n / 2147483648) * 2 - 1) * 7
  }
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const s = project(back, { x: x + 0.5, y: y + 0.5 })
      const sx = Math.floor(s.x)
      const sy = Math.floor(s.y)
      const o = (y * w + x) * 4
      const light = 0.78 + 0.22 * (x / w)
      for (let ch = 0; ch < 3; ch++) {
        const v =
          sx >= 0 && sy >= 0 && sx < sheet.width && sy < sheet.height
            ? sheet.data[(sy * sheet.width + sx) * 4 + ch]
            : 110
        data[o + ch] = v * light + noise()
      }
      data[o + 3] = 255
    }
  return { data, width: w, height: h }
}

/** The cloth a draft weaves, as rows of 0/1. */
const clothOf = (d: ReturnType<typeof draftFromScan>['draft']) => computeDrawdown(d).map((r) => r.map(Number).join(''))

describe('paper sheets', () => {
  it('carries its settings in its QR code', () => {
    const spec: SheetSpec = { kind: 'drawdown', name: 'Café; twill', ends: 24, picks: 30, paper: 'letter' }
    expect(decodeSpec(encodeSpec(spec))).toEqual(spec)
    expect(decodeSpec('https://example.com')).toBeNull()
    expect(decodeSpec('WPPAPER1;drawdown;a4;1;9;x')).toBeNull()
  })

  it('fits the grid on the page, turning it to landscape for wide grids, and says when it won’t fit', () => {
    const tall = sheetLayout({ kind: 'drawdown', name: 'x', ends: 20, picks: 40, paper: 'a4' })
    expect(tall.page.landscape).toBe(false)
    const wide = sheetLayout({ kind: 'drawdown', name: 'x', ends: 60, picks: 24, paper: 'a4' })
    expect(wide.page.landscape).toBe(true)
    for (const l of [tall, wide]) {
      const right = l.weftStrip.x + l.grid.cell
      const bottom = l.grid.y + l.spec.picks * l.grid.cell
      expect(right).toBeLessThanOrEqual(l.page.w - 10)
      expect(bottom).toBeLessThan(l.marks[3].y)
      expect(l.warpStrip.y).toBeGreaterThan(l.qr.y + l.qr.h)
    }
    expect(() => sheetLayout({ kind: 'drawdown', name: 'x', ends: 150, picks: 150, paper: 'a4' })).toThrow(
      /under 3.5 mm/,
    )
  })
})

describe('reading a filled-in sheet', () => {
  // A 2/2 twill drawn in: warp where (row + col) % 4 < 2.
  const twill = (r: number, c: number) => (r + c) % 4 < 2

  it('reads a flat scan: the grid, the strips’ colours and the name', () => {
    const spec: SheetSpec = { kind: 'drawdown', name: 'Scanned twill', ends: 16, picks: 16, paper: 'a4' }
    const sheet = filledSheet(spec, {
      cell: (r, c) => (twill(r, c) ? '#1f3a93' : null),
      warp: () => '#1f3a93',
      weft: (r) => (r < 8 ? '#e8b923' : '#c0392b'),
    })
    const scan = readSheet(sheet)
    expect(scan.marksFound).toBe(true)
    expect(scan.spec).toEqual(spec)
    const { draft, name } = draftFromScan(scan)
    expect(name).toBe('Scanned twill')
    expect(clothOf(draft)).toEqual(
      Array.from({ length: 16 }, (_, r) => Array.from({ length: 16 }, (_, c) => (twill(r, c) ? 1 : 0)).join('')),
    )
    expect([draft.shafts, draft.treadles]).toEqual([4, 4])
    expect(deltaE(rgb(draft.warpColors[0]), rgb('#1f3a93'))).toBeLessThan(8)
    expect(deltaE(rgb(draft.weftColors[0]), rgb('#e8b923'))).toBeLessThan(8)
    expect(deltaE(rgb(draft.weftColors[12]), rgb('#c0392b'))).toBeLessThan(8)
  })

  it('reads a photo taken at an angle, unevenly lit, with no strips coloured', () => {
    const spec: SheetSpec = { kind: 'drawdown', name: 'Photo', ends: 20, picks: 24, paper: 'a4' }
    // A pattern with a few different columns: diamonds.
    const diamond = (r: number, c: number) => Math.abs((r % 8) - 4) + Math.abs((c % 8) - 4) <= 3
    const sheet = filledSheet(spec, { cell: (r, c) => (diamond(r, c) ? '#2e7d32' : null) })
    const photo = photograph(
      sheet,
      [
        { x: 140, y: 110 },
        { x: 1300, y: 60 },
        { x: 1420, y: 1820 },
        { x: 70, y: 1700 },
      ],
      1500,
      1900,
    )
    const scan = readSheet(photo)
    expect(scan.marksFound).toBe(true)
    const { draft } = draftFromScan(scan)
    expect(clothOf(draft)).toEqual(
      Array.from({ length: 24 }, (_, r) => Array.from({ length: 20 }, (_, c) => (diamond(r, c) ? 1 : 0)).join('')),
    )
    // The ink's colour, despite the light falling off across the photo.
    expect(deltaE(rgb(draft.warpColors[4]), rgb('#2e7d32'))).toBeLessThan(12)
  })

  it('reads a fully coloured drawing, telling warp from weft by the strips', () => {
    const spec: SheetSpec = { kind: 'drawdown', name: 'Colours', ends: 12, picks: 12, paper: 'a4' }
    const warpC = '#b71c1c'
    const weftC = '#fbc02d'
    const sheet = filledSheet(spec, {
      cell: (r, c) => (twill(r, c) ? warpC : weftC),
      warp: () => warpC,
      weft: () => weftC,
    })
    const { draft, warp, weft } = draftFromScan(readSheet(sheet))
    expect([warp, weft]).toEqual([72, 72])
    expect(clothOf(draft)[0]).toBe('110011001100')
    expect(deltaE(rgb(draft.weftColors[0]), rgb(weftC))).toBeLessThan(8)
  })

  it('says what’s wrong with a picture without the sheet in it', () => {
    const blank = { data: new Uint8ClampedArray(400 * 300 * 4).fill(200), width: 400, height: 300 }
    expect(() => readSheet(blank)).toThrow(/QR code/)
  })
})
