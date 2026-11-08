import { type KnitChart, rowsOf, widthOf } from './chart'
import { STITCHES, type StitchId } from './stitches'

/** A square on the chart: row r (0 is row 1, at the bottom) and stitch column c (0 is the leftmost, as drawn). */
export interface Cell {
  r: number
  c: number
}

/** What a stroke puts down: a stitch or a colour. */
export type Brush = { kind: 'stitch'; id: StitchId } | { kind: 'color'; index: number }

/**
 * How a drag draws: freehand, a straight line, a box or an oval between where it started and where it is, a flood
 * fill of the area clicked, or picking up the stitch or colour of the square clicked.
 */
export type Tool = 'draw' | 'line' | 'rect' | 'oval' | 'fill' | 'pick'
export const TOOLS: readonly Tool[] = ['draw', 'line', 'rect', 'oval', 'fill', 'pick']

/** Tools that draw a shape between two corners, so a drag on a touch screen draws rather than scrolls. */
export const dragsShape = (t: Tool) => t === 'line' || t === 'rect' || t === 'oval'

/** Mirroring as you draw: left to right, top to bottom, or both (four ways). */
export type Symmetry = 'none' | 'across' | 'up' | 'both'
export const SYMMETRIES: readonly Symmetry[] = ['none', 'across', 'up', 'both']

/** The squares on a straight line from a to b, both ends included, with no gaps (Bresenham's line). */
export function lineCells(a: Cell, b: Cell): Cell[] {
  const out: Cell[] = []
  const dc = Math.abs(b.c - a.c)
  const dr = -Math.abs(b.r - a.r)
  const sc = a.c < b.c ? 1 : -1
  const sr = a.r < b.r ? 1 : -1
  let err = dc + dr
  let { r, c } = a
  for (;;) {
    out.push({ r, c })
    if (r === b.r && c === b.c) return out
    const e2 = 2 * err
    if (e2 >= dr) {
      err += dr
      c += sc
    }
    if (e2 <= dc) {
      err += dc
      r += sr
    }
  }
}

const bounds = (a: Cell, b: Cell) => ({
  r0: Math.min(a.r, b.r),
  r1: Math.max(a.r, b.r),
  c0: Math.min(a.c, b.c),
  c1: Math.max(a.c, b.c),
})

/** The squares of the box with corners a and b: its edge, or all of it when filled. */
export function rectCells(a: Cell, b: Cell, filled: boolean): Cell[] {
  const { r0, r1, c0, c1 } = bounds(a, b)
  const out: Cell[] = []
  for (let r = r0; r <= r1; r++)
    for (let c = c0; c <= c1; c++) if (filled || r === r0 || r === r1 || c === c0 || c === c1) out.push({ r, c })
  return out
}

/**
 * The squares of the oval that fits the box with corners a and b: those whose middle is inside it, or (not filled)
 * just the ones of those beside a square outside it, so the outline has no gaps.
 */
export function ovalCells(a: Cell, b: Cell, filled: boolean): Cell[] {
  const { r0, r1, c0, c1 } = bounds(a, b)
  const cr = (r0 + r1) / 2
  const cc = (c0 + c1) / 2
  const ry = (r1 - r0 + 1) / 2
  const rx = (c1 - c0 + 1) / 2
  const inside = (r: number, c: number) =>
    r >= r0 && r <= r1 && c >= c0 && c <= c1 && ((c - cc) / rx) ** 2 + ((r - cr) / ry) ** 2 <= 1
  const out: Cell[] = []
  for (let r = r0; r <= r1; r++)
    for (let c = c0; c <= c1; c++) {
      if (!inside(r, c)) continue
      if (filled || !inside(r - 1, c) || !inside(r + 1, c) || !inside(r, c - 1) || !inside(r, c + 1)) out.push({ r, c })
    }
  return out
}

/**
 * The area a fill covers: the squares joined edge to edge to the one clicked that have the same colour (for a
 * colour brush) or stitch (for a stitch brush) as it.
 */
export function fillCells(k: KnitChart, from: Cell, kind: Brush['kind']): Cell[] {
  const rows = rowsOf(k)
  const w = widthOf(k)
  if (from.r < 0 || from.r >= rows || from.c < 0 || from.c >= w) return []
  const value = (r: number, c: number) => (kind === 'color' ? k.color[r][c] : k.stitch[r][c])
  const target = value(from.r, from.c)
  const seen = new Uint8Array(rows * w)
  const out: Cell[] = []
  const stack = [from]
  seen[from.r * w + from.c] = 1
  while (stack.length) {
    const cell = stack.pop() as Cell
    out.push(cell)
    for (const [dr, dc] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const r = cell.r + dr
      const c = cell.c + dc
      if (r < 0 || r >= rows || c < 0 || c >= w || seen[r * w + c] || value(r, c) !== target) continue
      seen[r * w + c] = 1
      stack.push({ r, c })
    }
  }
  return out
}

/**
 * The lines symmetry mirrors about, as twice the column and row they fall on (so a line between two squares is a
 * whole number too): the middle of the repeat box if there is one, otherwise of the chart, and the chart's middle row.
 */
export function mirrorLines(k: KnitChart): { across: number; up: number } {
  const across = k.repeat ? k.repeat.from + k.repeat.to : widthOf(k) - 1
  return { across, up: rowsOf(k) - 1 }
}

/** A square to paint, and whether it's a left-to-right mirror image (so stitches that lean, lean the other way). */
export interface Mark extends Cell {
  flipped: boolean
}

/** The squares with their mirror images added, as symmetry asks; mirror images off the chart are left out. */
export function mirrored(k: KnitChart, cells: readonly Cell[], symmetry: Symmetry): Mark[] {
  const { across, up } = mirrorLines(k)
  const w = widthOf(k)
  const rows = rowsOf(k)
  const out: Mark[] = []
  const add = (r: number, c: number, flipped: boolean) => {
    if (r >= 0 && r < rows && c >= 0 && c < w) out.push({ r, c, flipped })
  }
  for (const { r, c } of cells) {
    add(r, c, false)
    if (symmetry === 'across' || symmetry === 'both') add(r, across - c, true)
    if (symmetry === 'up' || symmetry === 'both') add(up - r, c, false)
    if (symmetry === 'both') add(up - r, across - c, true)
  }
  return out
}

/**
 * The chart with the brush put down on each square. A cable fills as many squares as it crosses, to the right of
 * the square (to the left, in a mirror image, where it crosses the other way). Returns the same chart if nothing
 * changes.
 */
export function applyMarks(k: KnitChart, marks: readonly Mark[], brush: Brush): KnitChart {
  const w = widthOf(k)
  let changed = false
  if (brush.kind === 'color') {
    const color = k.color.map((row) => [...row])
    for (const { r, c } of marks)
      if (color[r][c] !== brush.index) {
        color[r][c] = brush.index
        changed = true
      }
    return changed ? { ...k, color } : k
  }
  const stitch = k.stitch.map((row) => [...row])
  for (const { r, c, flipped } of marks) {
    const id = flipped ? (STITCHES[brush.id].mirror ?? brush.id) : brush.id
    const span = STITCHES[id].cable ?? 1
    const start = Math.max(0, Math.min(flipped ? c - span + 1 : c, w - span))
    for (let j = start; j < start + span; j++)
      if (stitch[r][j] !== id) {
        stitch[r][j] = id
        changed = true
      }
  }
  return changed ? { ...k, stitch } : k
}

/** What a stroke from `from` to `to` with the tool puts down (before symmetry). Pick puts down nothing. */
export function toolCells(
  k: KnitChart,
  tool: Tool,
  from: Cell,
  to: Cell,
  filled: boolean,
  kind: Brush['kind'],
): Cell[] {
  switch (tool) {
    case 'draw':
    case 'line':
      return lineCells(from, to)
    case 'rect':
      return rectCells(from, to, filled)
    case 'oval':
      return ovalCells(from, to, filled)
    case 'fill':
      return fillCells(k, to, kind)
    case 'pick':
      return []
  }
}

/**
 * What the colour picker picks up from a square: its colour for a colour brush, its stitch for a stitch brush (in
 * the colourwork view, always its colour).
 */
export function pickBrush(k: KnitChart, at: Cell, kind: Brush['kind']): Brush {
  return kind === 'color'
    ? { kind: 'color', index: k.color[at.r][at.c] }
    : { kind: 'stitch', id: k.stitch[at.r][at.c] === 'none' ? 'k' : k.stitch[at.r][at.c] }
}

/** Symbols for colours in the colourwork view, as printed charts use: A is left plain. */
export const COLOR_SYMBOLS = ['', '●', '✕', '○', '▲', '◆', '▽', '■']
export const colorSymbol = (i: number) => COLOR_SYMBOLS[i] ?? String.fromCharCode(65 + i)
