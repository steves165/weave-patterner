import { isStitchId, makes, STITCHES, type StitchId } from './stitches'

/**
 * A knitting chart. Row 1 is at the bottom (rows[0]) and squares run left to right as drawn (cells[r][0] is the
 * leftmost). Knitting starts at the bottom right: right-side rows are read right to left and wrong-side rows left to
 * right; in the round every round is read right to left.
 */
export interface KnitChart {
  /** stitch[r][c]: the stitch in the square. */
  stitch: StitchId[][]
  /** color[r][c]: an index into `colors`. */
  color: number[][]
  colors: string[]
  /** Flat (back and forth, row 1 on the right side) or in the round. */
  mode: 'flat' | 'round'
  /** Gauge over 10 cm in stockinette. */
  gauge: { stitches: number; rows: number }
  /** Longest stranded float (in stitches) before it should be caught. */
  floatLimit: number
  /**
   * How colours are worked: stranded (the yarns not in use carried behind, as floats) or intarsia (a separate
   * bobbin for each area of colour). Stranded unless set.
   */
  colorwork?: 'stranded' | 'intarsia'
  /** Sizes the pattern is made in: each name with its finished width and length in cm. */
  sizes?: { name: string; width: number; length: number }[]
  /**
   * The pattern repeat: stitches (columns, as drawn, 0-based) `from` to `to`, outlined in red as in published
   * charts. They're worked as many times as the width needs, with the stitches either side worked once.
   */
  repeat?: { from: number; to: number }
  /** Named panels (A, B, C…): stretches of stitches worked as charts of their own, such as a cable or an edging. */
  panels?: Panel[]
}

/** A panel: stitches (columns, as drawn) `from` to `to`, named, worked as its own chart within the pattern. */
export interface Panel {
  from: number
  to: number
  name: string
}

/**
 * Panels inside the chart and not overlapping (a later one gives way to an earlier one), in the order right-side
 * rows meet them: from stitch 1 at the right. So Panel A is the first one worked.
 */
export function cleanPanels(panels: Panel[], width: number): Panel[] {
  const sorted = panels
    .map((p) => ({ ...p, to: Math.min(p.to, width - 1) }))
    .filter((p) => Number.isInteger(p.from) && Number.isInteger(p.to) && p.from >= 0 && p.from <= p.to)
    .sort((a, b) => b.from - a.from)
  const out: Panel[] = []
  for (const p of sorted) if (!out.length || p.to < out[out.length - 1].from) out.push(p)
  return out
}

/** Panels kept within `width`, or none. */
const panelsWithin = (panels: Panel[] | undefined, width: number) => {
  const clean = panels ? cleanPanels(panels, width) : []
  return clean.length ? clean : undefined
}

export const MAX_STITCHES = 120
export const MAX_ROWS = 160
export const MAX_COLORS = 8

export const rowsOf = (k: KnitChart) => k.stitch.length
export const widthOf = (k: KnitChart) => k.stitch[0]?.length ?? 0

export function blankChart(stitches = 24, rows = 24, colors = ['#f2ead8', '#2e5e8c']): KnitChart {
  return {
    stitch: Array.from({ length: rows }, () => Array<StitchId>(stitches).fill('k')),
    color: Array.from({ length: rows }, () => Array<number>(stitches).fill(0)),
    colors,
    mode: 'flat',
    gauge: { stitches: 22, rows: 30 },
    floatLimit: 5,
  }
}

/** The chart at a new size, keeping what fits; new squares are knit in the first colour. Rows grow at the top. */
export function resize(k: KnitChart, stitches: number, rows: number): KnitChart {
  const w = Math.max(1, Math.min(MAX_STITCHES, Math.round(stitches)))
  const h = Math.max(1, Math.min(MAX_ROWS, Math.round(rows)))
  const repeat = k.repeat && k.repeat.from < w ? { from: k.repeat.from, to: Math.min(k.repeat.to, w - 1) } : undefined
  return {
    ...k,
    stitch: Array.from({ length: h }, (_, r) => Array.from({ length: w }, (_, c) => k.stitch[r]?.[c] ?? 'k')),
    color: Array.from({ length: h }, (_, r) => Array.from({ length: w }, (_, c) => k.color[r]?.[c] ?? 0)),
    repeat: repeat && !(repeat.from === 0 && repeat.to === w - 1) ? repeat : undefined,
    panels: panelsWithin(k.panels, w),
  }
}

/** Whether row r (0-based) is worked from the right side. */
export const isRightSide = (k: KnitChart, r: number) => k.mode === 'round' || r % 2 === 0

/** Sets one square; a cable fills as many squares as it crosses, to the right of the one clicked. */
export function paint(k: KnitChart, r: number, c: number, patch: { stitch?: StitchId; color?: number }): KnitChart {
  const w = widthOf(k)
  const span = patch.stitch ? (STITCHES[patch.stitch].cable ?? 1) : 1
  const from = Math.max(0, Math.min(c, w - span))
  const inSpan = (j: number) => j >= from && j < from + span
  const stitch =
    patch.stitch === undefined
      ? k.stitch
      : k.stitch.map((row, i) => (i === r ? row.map((s, j) => (inSpan(j) ? (patch.stitch as StitchId) : s)) : row))
  const color =
    patch.color === undefined
      ? k.color
      : k.color.map((row, i) => (i === r ? row.map((v, j) => (j === c ? (patch.color as number) : v)) : row))
  if (stitch[r].every((s, j) => s === k.stitch[r][j]) && color[r].every((v, j) => v === k.color[r][j])) return k
  return { ...k, stitch, color }
}

/** Left to right mirror image: decreases, increases and cables lean the other way. */
export function mirror(k: KnitChart): KnitChart {
  return {
    ...k,
    stitch: k.stitch.map((row) => [...row].reverse().map((s) => STITCHES[s].mirror ?? s)),
    color: k.color.map((row) => [...row].reverse()),
    repeat: k.repeat && { from: widthOf(k) - 1 - k.repeat.to, to: widthOf(k) - 1 - k.repeat.from },
    panels: panelsWithin(
      k.panels?.map((p) => ({ ...p, from: widthOf(k) - 1 - p.to, to: widthOf(k) - 1 - p.from })),
      widthOf(k),
    ),
  }
}

/**
 * The stitches the repeat box works, and those worked once either side of it (each as used from the row below, on
 * row 1): so a piece is cast on as a multiple of `repeat` stitches plus `edges`. Null without a repeat box.
 */
export function repeatStitches(k: KnitChart): { repeat: number; edges: number } | null {
  if (!k.repeat || !k.stitch[0]) return null
  const row = k.stitch[0]
  const box = rowCounts(row.slice(k.repeat.from, k.repeat.to + 1)).uses
  return { repeat: box, edges: rowCounts(row).uses - box }
}

/** The cables in a row: runs of one cable stitch, split into crossings from the left. */
export function cablesIn(row: StitchId[]): { start: number; id: StitchId; width: number; whole: boolean }[] {
  const out: { start: number; id: StitchId; width: number; whole: boolean }[] = []
  for (let c = 0; c < row.length; ) {
    const span = STITCHES[row[c]].cable
    if (!span) {
      c++
      continue
    }
    let end = c
    while (end < row.length && row[end] === row[c]) end++
    for (let s = c; s < end; s += span)
      out.push({ start: s, id: row[c], width: Math.min(span, end - s), whole: end - s >= span })
    c = end
  }
  return out
}

/** Stitches a row works off the needle, and stitches it leaves. */
export function rowCounts(row: StitchId[]): { uses: number; makes: number } {
  let uses = 0
  let made = 0
  for (const s of row) {
    uses += STITCHES[s].uses
    made += makes(s)
  }
  return { uses, makes: made }
}

/** Stitches to cast on: what row 1 works. */
export const castOn = (k: KnitChart) => (k.stitch[0] ? rowCounts(k.stitch[0]).uses : 0)

export interface Problem {
  row: number
  message: string
}

/**
 * Rows that can't be knitted as charted: a row must work exactly the stitches the row below left; cables must have
 * all their squares; cables on wrong-side rows are flagged, as they are normally crossed from the right side.
 */
export function problems(k: KnitChart): Problem[] {
  const out: Problem[] = []
  k.stitch.forEach((row, r) => {
    const n = r + 1
    if (r > 0) {
      const before = rowCounts(k.stitch[r - 1]).makes
      const { uses } = rowCounts(row)
      if (uses !== before)
        out.push({
          row: n,
          message: `${label(k, r)} works ${uses} stitch${uses === 1 ? '' : 'es'}, but ${label(k, r - 1).toLowerCase()} left ${before}.`,
        })
    }
    for (const cable of cablesIn(row)) {
      if (!cable.whole)
        out.push({
          row: n,
          message: `${label(k, r)}: a ${STITCHES[cable.id].rs} cable needs ${STITCHES[cable.id].cable} squares.`,
        })
    }
    for (const cable of cablesIn(row)) {
      const end = cable.start + cable.width - 1
      const cut = (k.panels ?? []).findIndex(
        (p) => (cable.start < p.from && end >= p.from) || (cable.start <= p.to && end > p.to),
      )
      if (cut >= 0)
        out.push({
          row: n,
          message: `${label(k, r)}: a ${STITCHES[cable.id].rs} cable crosses the edge of panel ${String.fromCharCode(65 + cut)}.`,
        })
    }
    if (!isRightSide(k, r) && cablesIn(row).length > 0)
      out.push({
        row: n,
        message: `${label(k, r)} crosses a cable on a wrong-side row; cables are usually crossed from the right side.`,
      })
  })
  return out
}

/** "Row 3" or "Round 3". */
export const label = (k: KnitChart, r: number) => `${k.mode === 'round' ? 'Round' : 'Row'} ${r + 1}`

/** A colour's letter in the written pattern: A, B, C… */
export const colorLetter = (i: number) => String.fromCharCode(65 + i)

/** The colours used anywhere (with a stitch in the square), in order. */
export function usedColors(k: KnitChart): number[] {
  const used = new Set<number>()
  k.stitch.forEach((row, r) => {
    row.forEach((s, c) => {
      if (s !== 'none') used.add(k.color[r][c])
    })
  })
  return [...used].sort((a, b) => a - b)
}

export interface Float {
  /** 1-based row. */
  row: number
  /** The colour carried behind, and over how many stitches. */
  color: number
  length: number
  /** The first stitch it floats behind, 1-based from the right as knitters count. */
  from: number
}

/**
 * Stranded colourwork floats: in a row knitted with two or more colours, each colour not in use is carried behind
 * the stitches of the others. Returns the longest float in each row, if longer than the chart's limit.
 */
export function longFloats(k: KnitChart): Float[] {
  const out: Float[] = []
  // In intarsia nothing is carried behind.
  if (k.colorwork === 'intarsia') return out
  const w = widthOf(k)
  k.stitch.forEach((row, r) => {
    // Slipped stitches aren't worked, so no yarn is used there (the yarn carried past is counted as a float).
    const cells = row.flatMap((s, c) => (s === 'none' || s === 'sl' ? [] : [{ c, color: k.color[r][c] }]))
    const colors = [...new Set(cells.map((x) => x.color))]
    if (colors.length < 2) return
    let worst: Float | null = null
    for (const color of colors) {
      // Floats run between this colour's stitches; the ends of the row (before its first and after its last) are
      // where it's joined or left, so they don't float.
      const at = cells.flatMap((x, i) => (x.color === color ? [i] : []))
      for (let i = 1; i < at.length; i++) {
        const length = at[i] - at[i - 1] - 1
        if (length > (worst?.length ?? 0)) worst = { row: r + 1, color, length, from: w - cells[at[i] - 1].c }
      }
    }
    if (worst && worst.length > k.floatLimit) out.push(worst)
  })
  return out
}

/** Finished size of the chart in cm at the chart's gauge. */
export function size(k: KnitChart): { width: number; height: number } {
  const widest = Math.max(0, ...k.stitch.map((row) => rowCounts(row).makes))
  return { width: (widest * 10) / k.gauge.stitches, height: (rowsOf(k) * 10) / k.gauge.rows }
}

/**
 * Stitches to cast on for a width: the nearest whole number of repeats, plus any edge stitches (such as selvedges or
 * a stitch to centre the pattern). At least one repeat.
 */
export function castOnFor(widthCm: number, stitchesPer10: number, repeat: number, edges = 0): number {
  const want = (widthCm * stitchesPer10) / 10 - edges
  return Math.max(1, Math.round(want / Math.max(1, repeat))) * Math.max(1, repeat) + Math.max(0, edges)
}

/** Reads a saved chart, or null if it isn't one. */
export function parseChart(v: unknown): KnitChart | null {
  if (!v || typeof v !== 'object') return null
  const o = v as Partial<KnitChart>
  if (!Array.isArray(o.stitch) || !Array.isArray(o.color) || !Array.isArray(o.colors)) return null
  const rows = o.stitch.length
  const w = Array.isArray(o.stitch[0]) ? o.stitch[0].length : 0
  if (rows < 1 || rows > MAX_ROWS || w < 1 || w > MAX_STITCHES) return null
  if (o.colors.length < 1 || o.colors.length > MAX_COLORS) return null
  if (!o.colors.every((c) => typeof c === 'string' && /^#[0-9a-f]{6}$/i.test(c))) return null
  const ok =
    o.stitch.every((row) => Array.isArray(row) && row.length === w && row.every(isStitchId)) &&
    o.color.length === rows &&
    o.color.every(
      (row) =>
        Array.isArray(row) &&
        row.length === w &&
        row.every((c) => Number.isInteger(c) && c >= 0 && c < (o.colors as string[]).length),
    )
  if (!ok) return null
  const g = o.gauge
  const num = (n: unknown, d: number) => (typeof n === 'number' && n > 0 && n < 200 ? n : d)
  return {
    stitch: o.stitch,
    color: o.color,
    colors: o.colors,
    mode: o.mode === 'round' ? 'round' : 'flat',
    gauge: { stitches: num(g?.stitches, 22), rows: num(g?.rows, 30) },
    floatLimit: Math.round(num(o.floatLimit, 5)),
    ...(o.colorwork === 'intarsia' ? { colorwork: 'intarsia' as const } : {}),
    ...(Array.isArray(o.sizes)
      ? (() => {
          const ok = (n: unknown) => typeof n === 'number' && n > 0 && n <= 1000
          const sizes = o.sizes
            .filter((x) => x && typeof x.name === 'string' && ok(x.width) && ok(x.length))
            .map((x) => ({ name: x.name.slice(0, 20), width: x.width, length: x.length }))
            .slice(0, 12)
          return sizes.length ? { sizes } : {}
        })()
      : {}),
    ...(o.repeat &&
    Number.isInteger(o.repeat.from) &&
    Number.isInteger(o.repeat.to) &&
    o.repeat.from >= 0 &&
    o.repeat.from <= o.repeat.to &&
    o.repeat.to < w
      ? { repeat: { from: o.repeat.from, to: o.repeat.to } }
      : {}),
    ...(Array.isArray(o.panels)
      ? {
          panels: panelsWithin(
            o.panels
              .filter((p) => p && typeof p === 'object')
              .map((p) => ({ from: p.from, to: p.to, name: typeof p.name === 'string' ? p.name.slice(0, 60) : '' })),
            w,
          ),
        }
      : {}),
  }
}
