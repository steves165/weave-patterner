import { textOn } from '../colors'
import { cablesIn, isRightSide, type KnitChart, rowsOf, widthOf } from '../knit/chart'
import { STITCHES } from '../knit/stitches'
import { computeDrawdown, type Draft } from '../weave'
import { esc } from './html'

/** Rectangles for runs of one colour along each row, so a picture needs few shapes. */
function runs(rows: string[][], x0: number, y0: number, cell: number): string {
  const out: string[] = []
  rows.forEach((row, y) => {
    let start = 0
    for (let x = 1; x <= row.length; x++) {
      if (x < row.length && row[x] === row[start]) continue
      out.push(
        `<rect x="${x0 + start * cell}" y="${y0 + y * cell}" width="${(x - start) * cell}" height="${cell}" fill="${row[start]}"/>`,
      )
      start = x
    }
  })
  return out.join('')
}

/** The shortest n that the sequence repeats every n of (the whole length if it doesn't). */
function repeatOf(n: number, same: (a: number, b: number) => boolean): number {
  for (let k = 1; k < n; k++) {
    let ok = true
    for (let i = k; i < n && ok; i++) ok = same(i, i - k)
    if (ok) return k
  }
  return n
}

/** Drafts bigger than this many crossings are drawn as stripes (clothShapes) rather than a shape per run. */
const BIG = 128 * 128
let maskIds = 0

/**
 * The cloth of a big draft (a tartan's whole sett), in few shapes: the weft as stripes, then the warp as stripes
 * showing only where the warp is up, through a mask that repeats the weave's structure (4 × 4 for a twill).
 */
function clothShapes(d: Draft, up: boolean[][], x0: number, y0: number, cell: number): string {
  const w = d.ends * cell
  const h = d.picks * cell
  const stripes = (colours: string[], across: boolean) =>
    toRunsOf(colours)
      .map(({ color, from, count }) =>
        across
          ? `<rect x="${x0}" y="${y0 + from * cell}" width="${w}" height="${count * cell}" fill="${color}"/>`
          : `<rect x="${x0 + from * cell}" y="${y0}" width="${count * cell}" height="${h}" fill="${color}"/>`,
      )
      .join('')
  const rx = repeatOf(d.ends, (a, b) => up.every((row) => row[a] === row[b]))
  const ry = repeatOf(d.picks, (a, b) => up[a].every((v, e) => v === up[b][e]))
  const tile = up
    .slice(0, ry)
    .flatMap((row, y) =>
      row
        .slice(0, rx)
        .flatMap((v, x) => (v ? [`<rect x="${x * cell}" y="${y * cell}" width="${cell}" height="${cell}"/>`] : [])),
    )
    .join('')
  const id = `up${++maskIds}`
  return `<defs><pattern id="${id}t" x="${x0}" y="${y0}" width="${rx * cell}" height="${ry * cell}" patternUnits="userSpaceOnUse"><g fill="#fff">${tile}</g></pattern><mask id="${id}" maskUnits="userSpaceOnUse"><rect x="${x0}" y="${y0}" width="${w}" height="${h}" fill="url(#${id}t)"/></mask></defs>${stripes(d.weftColors, true)}<g mask="url(#${id})">${stripes(d.warpColors, false)}</g>`
}

/** Runs of one colour, with where each starts. */
function toRunsOf(colours: string[]): { color: string; from: number; count: number }[] {
  const out: { color: string; from: number; count: number }[] = []
  colours.forEach((color, i) => {
    const last = out[out.length - 1]
    if (last && last.color === color) last.count++
    else out.push({ color, from: i, count: 1 })
  })
  return out
}

/** The cloth: a shape per run of one colour for most drafts, stripes for big ones. */
function clothOf(d: Draft, x0: number, y0: number, cell: number): string {
  const dd = computeDrawdown(d)
  if (d.ends * d.picks > BIG) return clothShapes(d, dd, x0, y0, cell)
  return runs(
    dd.map((row, p) => row.map((up, e) => (up ? d.warpColors[e] : d.weftColors[p]))),
    x0,
    y0,
    cell,
  )
}

/** Grid lines over a w × h block of cells. */
function lines(x0: number, y0: number, w: number, h: number, cell: number, color: string): string {
  const d: string[] = []
  for (let i = 0; i <= w; i++) d.push(`M${x0 + i * cell} ${y0}v${h * cell}`)
  for (let j = 0; j <= h; j++) d.push(`M${x0} ${y0 + j * cell}h${w * cell}`)
  return `<path d="${d.join('')}" stroke="${color}" stroke-width="0.6" fill="none"/>`
}

/** A grid of boxes, the filled ones dark. */
function grid(on: boolean[][], x0: number, y0: number, cell: number): string {
  const h = on.length
  const w = on[0]?.length ?? 0
  const fills = on.flatMap((row, y) =>
    row.flatMap((v, x) =>
      v ? [`<rect x="${x0 + x * cell}" y="${y0 + y * cell}" width="${cell}" height="${cell}"/>`] : [],
    ),
  )
  return `<rect x="${x0}" y="${y0}" width="${w * cell}" height="${h * cell}" fill="#fff"/><g fill="#2b1622">${fills.join('')}</g>${lines(x0, y0, w, h, cell, '#b9a7b0')}`
}

/**
 * A weaving draft as a picture, laid out the usual way: threading above the drawdown (shaft 1 nearest it), tie-up
 * to the right of the threading, treadling to the right of the drawdown, pick 1 at the top.
 */
export function draftSvg(d: Draft, label: string, cell = 10): string {
  const gap = cell
  const threading = Array.from({ length: d.shafts }, (_, r) => d.threading.map((s) => s === d.shafts - 1 - r))
  const tieup = Array.from({ length: d.shafts }, (_, r) => d.tieup[d.shafts - 1 - r])
  const top = d.shafts * cell + gap
  const right = d.ends * cell + gap
  const width = right + d.treadles * cell
  const height = top + d.picks * cell
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img" aria-label="${esc(label)}">${grid(threading, 0, 0, cell)}${grid(tieup, right, 0, cell)}${clothOf(d, 0, top, cell)}${lines(0, top, d.ends, d.picks, cell, 'rgba(0,0,0,0.12)')}${grid(d.treadling, right, top, cell)}</svg>`
}

/** Just the cloth, small: for the lists of patterns. */
export function clothSvg(d: Draft, label: string, size = 160): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${d.ends} ${d.picks}" width="${size}" height="${size}" role="img" aria-label="${esc(label)}" shape-rendering="crispEdges">${clothOf(d, 0, 0, 1)}</svg>`
}

/**
 * A knitting chart as a picture: each square in its colour with the stitch's symbol, row 1 at the bottom, row
 * numbers at the side each row starts from (right for right-side rows).
 */
export function chartSvg(k: KnitChart, label: string, cell = 22): string {
  const rows = rowsOf(k)
  const w = widthOf(k)
  const margin = cell * 1.4
  const width = w * cell + margin * 2
  const height = rows * cell + cell
  const colors = Array.from({ length: rows }, (_, i) =>
    k.color[rows - 1 - i].map((c, x) =>
      k.stitch[rows - 1 - i][x] === 'none' ? '#c8c8c8' : (k.colors[c] ?? '#ffffff'),
    ),
  )
  const symbols: string[] = []
  const numbers: string[] = []
  for (let i = 0; i < rows; i++) {
    const r = rows - 1 - i
    k.stitch[r].forEach((id, x) => {
      const symbol = STITCHES[id]?.symbol
      if (!symbol || id === 'none') return
      const fill = textOn(colors[i][x])
      const size = symbol.length > 1 ? cell * 0.4 : cell * 0.65
      symbols.push(
        `<text x="${margin + x * cell + cell / 2}" y="${i * cell + cell / 2}" font-size="${size}" fill="${fill}" text-anchor="middle" dominant-baseline="central">${esc(symbol)}</text>`,
      )
    })
    // Cables are drawn across their squares, as on a printed chart: the stitches that cross in front as the line on
    // top (rising to the right for a right cross, to the left for a left one).
    for (const cable of cablesIn(k.stitch[r])) {
      const stitch = STITCHES[cable.id]
      const x0 = margin + cable.start * cell
      const x1 = x0 + cable.width * cell
      const y0 = i * cell + cell * 0.15
      const y1 = (i + 1) * cell - cell * 0.15
      const rising = `M${x0 + 3} ${y1}L${x1 - 3} ${y0}`
      const falling = `M${x0 + 3} ${y0}L${x1 - 3} ${y1}`
      const [back, front] = stitch.cross === 'left' ? [rising, falling] : [falling, rising]
      symbols.push(
        `<g><title>${esc(stitch.rs)}</title><rect x="${x0 + 0.5}" y="${i * cell + 0.5}" width="${cable.width * cell - 1}" height="${cell - 1}" fill="${colors[i][cable.start]}"/><path d="${back}" stroke="#2b1622" stroke-width="${cell * 0.12}" fill="none"/><path d="${front}" stroke="${colors[i][cable.start]}" stroke-width="${cell * 0.32}" fill="none"/><path d="${front}" stroke="#2b1622" stroke-width="${cell * 0.12}" fill="none"/></g>`,
      )
    }
    // Right-side rows (every round in the round) start at the right.
    const rightSide = isRightSide(k, r)
    numbers.push(
      `<text x="${rightSide ? margin + w * cell + margin / 2 : margin / 2}" y="${i * cell + cell / 2}" font-size="${cell * 0.5}" fill="#6b5a63" text-anchor="middle" dominant-baseline="central">${r + 1}</text>`,
    )
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img" aria-label="${esc(label)}" font-family="system-ui, sans-serif">${runs(colors, margin, 0, cell)}${lines(margin, 0, w, rows, cell, 'rgba(0,0,0,0.25)')}${symbols.join('')}${numbers.join('')}</svg>`
}
