import { type KnitChart, MAX_ROWS, MAX_STITCHES, rowsOf, widthOf } from './chart'
import { STITCHES, type StitchId } from './stitches'

/** A rectangle of squares: rows r0 (lowest) to r1 and stitches (columns, as drawn) c0 (leftmost) to c1, inclusive. */
export interface Rect {
  r0: number
  r1: number
  c0: number
  c1: number
}

/** Squares copied from a chart, rows bottom first, to paste elsewhere. */
export interface Clip {
  stitch: StitchId[][]
  color: number[][]
}

/** The rectangle between two squares, either way round. */
export const rectBetween = (a: { r: number; c: number }, b: { r: number; c: number }): Rect => ({
  r0: Math.min(a.r, b.r),
  r1: Math.max(a.r, b.r),
  c0: Math.min(a.c, b.c),
  c1: Math.max(a.c, b.c),
})

export const rectSize = (s: Rect) => ({ stitches: s.c1 - s.c0 + 1, rows: s.r1 - s.r0 + 1 })

const inside = (s: Rect, r: number, c: number) => r >= s.r0 && r <= s.r1 && c >= s.c0 && c <= s.c1

/** The rectangle kept within the chart. */
export function clampRect(k: KnitChart, s: Rect): Rect {
  const [rows, w] = [rowsOf(k), widthOf(k)]
  const clamp = (v: number, max: number) => Math.max(0, Math.min(max - 1, v))
  return { r0: clamp(s.r0, rows), r1: clamp(s.r1, rows), c0: clamp(s.c0, w), c1: clamp(s.c1, w) }
}

export function copy(k: KnitChart, s: Rect): Clip {
  const rows = Array.from({ length: s.r1 - s.r0 + 1 }, (_, i) => s.r0 + i)
  return {
    stitch: rows.map((r) => k.stitch[r].slice(s.c0, s.c1 + 1)),
    color: rows.map((r) => k.color[r].slice(s.c0, s.c1 + 1)),
  }
}

/** Puts a clip down with its bottom-left square at row r, stitch c; what falls off the chart is left out. */
export function paste(k: KnitChart, clip: Clip, r: number, c: number): KnitChart {
  const top = k.colors.length - 1
  return {
    ...k,
    stitch: k.stitch.map((row, i) => row.map((s, j) => clip.stitch[i - r]?.[j - c] ?? s)),
    color: k.color.map((row, i) =>
      row.map((v, j) => {
        const pasted = clip.color[i - r]?.[j - c]
        return pasted === undefined ? v : Math.min(top, pasted)
      }),
    ),
  }
}

/** Back to plain knit squares in the first colour. */
export function clear(k: KnitChart, s: Rect): KnitChart {
  return {
    ...k,
    stitch: k.stitch.map((row, r) => row.map((x, c) => (inside(s, r, c) ? 'k' : x))),
    color: k.color.map((row, r) => row.map((x, c) => (inside(s, r, c) ? 0 : x))),
  }
}

/** Mirrors the squares left to right: decreases, increases and cables lean the other way. */
export function flipAcross(k: KnitChart, s: Rect): KnitChart {
  const from = (c: number) => s.c0 + s.c1 - c
  return {
    ...k,
    stitch: k.stitch.map((row, r) =>
      row.map((x, c) => (inside(s, r, c) ? (STITCHES[row[from(c)]].mirror ?? row[from(c)]) : x)),
    ),
    color: k.color.map((row, r) => row.map((x, c) => (inside(s, r, c) ? row[from(c)] : x))),
  }
}

/** Turns the squares upside down: the top row becomes the bottom one. */
export function flipUp(k: KnitChart, s: Rect): KnitChart {
  const from = (r: number) => s.r0 + s.r1 - r
  return {
    ...k,
    stitch: k.stitch.map((row, r) => row.map((x, c) => (inside(s, r, c) ? k.stitch[from(r)][c] : x))),
    color: k.color.map((row, r) => row.map((x, c) => (inside(s, r, c) ? k.color[from(r)][c] : x))),
  }
}

/** Repeats the squares across the whole width of their rows, lined up with where they are. */
export function repeatAcross(k: KnitChart, s: Rect): KnitChart {
  const n = s.c1 - s.c0 + 1
  const src = (c: number) => s.c0 + ((((c - s.c0) % n) + n) % n)
  const rows = (r: number) => r >= s.r0 && r <= s.r1
  return {
    ...k,
    stitch: k.stitch.map((row, r) => (rows(r) ? row.map((_, c) => row[src(c)]) : row)),
    color: k.color.map((row, r) => (rows(r) ? row.map((_, c) => row[src(c)]) : row)),
  }
}

/** Repeats the squares up and down the whole chart, in their stitches, lined up with where they are. */
export function repeatUp(k: KnitChart, s: Rect): KnitChart {
  const n = s.r1 - s.r0 + 1
  const src = (r: number) => s.r0 + ((((r - s.r0) % n) + n) % n)
  const cols = (c: number) => c >= s.c0 && c <= s.c1
  return {
    ...k,
    stitch: k.stitch.map((row, r) => row.map((x, c) => (cols(c) ? k.stitch[src(r)][c] : x))),
    color: k.color.map((row, r) => row.map((x, c) => (cols(c) ? k.color[src(r)][c] : x))),
  }
}

/** Adds `n` rows of plain knitting before row `at` (0-based; rows(k) adds them at the top). */
export function insertRows(k: KnitChart, at: number, n = 1): KnitChart {
  const add = Math.max(0, Math.min(n, MAX_ROWS - rowsOf(k)))
  if (add === 0) return k
  const w = widthOf(k)
  const fresh = <T>(v: T) => Array.from({ length: add }, () => Array<T>(w).fill(v))
  return {
    ...k,
    stitch: [...k.stitch.slice(0, at), ...fresh<StitchId>('k'), ...k.stitch.slice(at)],
    color: [...k.color.slice(0, at), ...fresh(0), ...k.color.slice(at)],
  }
}

/** Takes out rows r0 to r1 (at least one row stays). */
export function deleteRows(k: KnitChart, r0: number, r1: number): KnitChart {
  if (r1 - r0 + 1 >= rowsOf(k)) return k
  return {
    ...k,
    stitch: k.stitch.filter((_, r) => r < r0 || r > r1),
    color: k.color.filter((_, r) => r < r0 || r > r1),
  }
}

/** Moves a span of columns when columns are added or taken out, or drops it if it's taken out entirely. */
function shiftSpan<T extends { from: number; to: number }>(
  span: T,
  edit: { at: number; added: number } | { c0: number; c1: number },
): T | null {
  if ('added' in edit) {
    const { at, added } = edit
    if (span.to < at) return span
    if (span.from >= at) return { ...span, from: span.from + added, to: span.to + added }
    return { ...span, to: span.to + added }
  }
  const gone = edit.c1 - edit.c0 + 1
  const keep = (c: number) => (c < edit.c0 ? c : c > edit.c1 ? c - gone : null)
  const from = keep(span.from) ?? (span.from < edit.c0 ? span.from : edit.c0)
  const to = keep(span.to) ?? edit.c0 - 1
  return to >= from ? { ...span, from, to } : null
}

/** Adds `n` stitches of plain knitting before column `at` (0-based, as drawn; width(k) adds them at the left). */
export function insertColumns(k: KnitChart, at: number, n = 1): KnitChart {
  const add = Math.max(0, Math.min(n, MAX_STITCHES - widthOf(k)))
  if (add === 0) return k
  const edit = { at, added: add }
  return {
    ...k,
    stitch: k.stitch.map((row) => [...row.slice(0, at), ...Array<StitchId>(add).fill('k'), ...row.slice(at)]),
    color: k.color.map((row) => [...row.slice(0, at), ...Array<number>(add).fill(0), ...row.slice(at)]),
    repeat: k.repeat ? (shiftSpan(k.repeat, edit) ?? undefined) : undefined,
  }
}

/** Takes out stitches (columns) c0 to c1 (at least one stays). */
export function deleteColumns(k: KnitChart, c0: number, c1: number): KnitChart {
  if (c1 - c0 + 1 >= widthOf(k)) return k
  return {
    ...k,
    stitch: k.stitch.map((row) => row.filter((_, c) => c < c0 || c > c1)),
    color: k.color.map((row) => row.filter((_, c) => c < c0 || c > c1)),
    repeat: k.repeat ? (shiftSpan(k.repeat, { c0, c1 }) ?? undefined) : undefined,
  }
}

/** Marks stitches (columns) c0 to c1 as the repeat; covering the whole width (or nothing) means no box. */
export function setRepeat(k: KnitChart, c0: number, c1: number): KnitChart {
  const [from, to] = [Math.max(0, Math.min(c0, c1)), Math.min(widthOf(k) - 1, Math.max(c0, c1))]
  if (from === 0 && to === widthOf(k) - 1) return { ...k, repeat: undefined }
  return { ...k, repeat: { from, to } }
}
