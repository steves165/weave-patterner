import { cleanPanels, type KnitChart, MAX_COLORS, MAX_ROWS, type Panel, rowsOf, widthOf } from './chart'
import { insertColumns } from './edit'
import { isStitchId, type StitchId } from './stitches'

export type { Panel }

/** A panel kept in the panel store to use again: its squares (rows from the bottom) and their colours. */
export interface SavedPanel {
  name: string
  stitch: StitchId[][]
  color: number[][]
  colors: string[]
}

/** A, B, C… */
export const panelLetter = (i: number) => String.fromCharCode(65 + (i % 26))

const withPanels = (k: KnitChart, panels: Panel[]): KnitChart => {
  const clean = cleanPanels(panels, widthOf(k))
  return { ...k, panels: clean.length ? clean : undefined }
}

/** Makes stitches c0 to c1 a panel; panels it overlaps are cut back. */
export function addPanel(k: KnitChart, c0: number, c1: number, name = ''): KnitChart {
  const [a, b] = [Math.min(c0, c1), Math.max(c0, c1)]
  const kept = (k.panels ?? []).flatMap((p) =>
    p.to < a || p.from > b
      ? [p]
      : [
          { ...p, to: a - 1 },
          { ...p, from: b + 1 },
        ].filter((x) => x.from <= x.to),
  )
  return withPanels(k, [...kept, { from: a, to: b, name: name.trim() }])
}

export const renamePanel = (k: KnitChart, i: number, name: string) =>
  withPanels(
    k,
    (k.panels ?? []).map((p, j) => (j === i ? { ...p, name } : p)),
  )

export const removePanel = (k: KnitChart, i: number) =>
  withPanels(
    k,
    (k.panels ?? []).filter((_, j) => j !== i),
  )

/** "Panel A (Cable)" or "Panel A". */
export function panelTitle(k: KnitChart, i: number): string {
  const p = (k.panels ?? [])[i]
  return `Panel ${panelLetter(i)}${p?.name ? ` (${p.name})` : ''}`
}

/** The panel's own chart: its columns of the whole chart, in the same colours, flat or round. */
export function panelChart(k: KnitChart, p: Panel): KnitChart {
  return {
    ...k,
    stitch: k.stitch.map((row) => row.slice(p.from, p.to + 1)),
    color: k.color.map((row) => row.slice(p.from, p.to + 1)),
    repeat: undefined,
    panels: undefined,
  }
}

/** The fewest rows after which the panel repeats up the chart (a cable crossed every 6 rows: 6). */
export function panelRows(k: KnitChart, p: Panel): number {
  const rows = rowsOf(k)
  const same = (a: number, b: number) =>
    k.stitch[a].slice(p.from, p.to + 1).join() === k.stitch[b].slice(p.from, p.to + 1).join() &&
    k.color[a].slice(p.from, p.to + 1).join() === k.color[b].slice(p.from, p.to + 1).join()
  for (let n = 1; n < rows; n++) {
    // Flat knitting keeps right and wrong sides in step only over an even number of rows.
    if (k.mode === 'flat' && n % 2) continue
    if (rows % n) continue
    let ok = true
    for (let r = n; r < rows && ok; r++) ok = same(r, r - n)
    if (ok) return n
  }
  return rows
}

/** The panel's squares and colours, ready for the panel store. */
export function savePanel(k: KnitChart, i: number, name: string): SavedPanel {
  const p = (k.panels ?? [])[i]
  const n = panelRows(k, p)
  return {
    name,
    stitch: k.stitch.slice(0, n).map((row) => row.slice(p.from, p.to + 1)),
    color: k.color.slice(0, n).map((row) => row.slice(p.from, p.to + 1)),
    colors: k.colors,
  }
}

const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a)

/**
 * Puts a saved panel into the chart before column `at`, as a new named panel. Its colours are matched to the
 * chart's (added if they're new and there's room). Its rows repeat up the chart; if the chart and panel repeat
 * over different numbers of rows, the chart grows to a number of rows both fit (repeating its rows), when that's
 * not too many.
 */
export function insertPanel(k: KnitChart, saved: SavedPanel, at: number): KnitChart {
  const width = saved.stitch[0].length
  // Rows: enough for both to repeat whole, if that's not too many.
  const [rows, n] = [rowsOf(k), saved.stitch.length]
  const both = (rows * n) / gcd(rows, n)
  const target = both <= MAX_ROWS ? both : rows
  let grown: KnitChart = k
  if (target > rows)
    grown = {
      ...k,
      stitch: Array.from({ length: target }, (_, r) => k.stitch[r % rows]),
      color: Array.from({ length: target }, (_, r) => k.color[r % rows]),
    }
  // Colours: the chart's own where they match, else new ones.
  const colors = [...grown.colors]
  const map = saved.colors.map((hex) => {
    const found = colors.findIndex((c) => c.toLowerCase() === hex.toLowerCase())
    if (found >= 0) return found
    if (colors.length < MAX_COLORS) {
      colors.push(hex)
      return colors.length - 1
    }
    return 0
  })
  const spaced = insertColumns({ ...grown, colors }, at, width)
  const added = widthOf(spaced) - widthOf(grown)
  if (added < width) return k
  const next: KnitChart = {
    ...spaced,
    stitch: spaced.stitch.map((row, r) =>
      row.map((s, c) => (c >= at && c < at + width ? saved.stitch[r % n][c - at] : s)),
    ),
    color: spaced.color.map((row, r) =>
      row.map((v, c) => (c >= at && c < at + width ? map[saved.color[r % n][c - at]] : v)),
    ),
  }
  return addPanel(next, at, at + width - 1, saved.name)
}

export const PANEL_STORE_KEY = 'knit-panels'

/** Reads the panel store from untrusted data, keeping the valid panels. */
export function parseSavedPanels(v: unknown): SavedPanel[] {
  if (!Array.isArray(v)) return []
  return v
    .filter(
      (p): p is SavedPanel =>
        p &&
        typeof p.name === 'string' &&
        Array.isArray(p.colors) &&
        p.colors.length >= 1 &&
        p.colors.every((c: unknown) => typeof c === 'string' && /^#[0-9a-f]{6}$/i.test(c)) &&
        Array.isArray(p.stitch) &&
        p.stitch.length >= 1 &&
        Array.isArray(p.color) &&
        p.color.length === p.stitch.length &&
        p.stitch.every(
          (row: unknown, r: number) =>
            Array.isArray(row) &&
            row.length === p.stitch[0].length &&
            row.length >= 1 &&
            row.every(isStitchId) &&
            Array.isArray(p.color[r]) &&
            p.color[r].length === row.length &&
            p.color[r].every(
              (c: unknown) => Number.isInteger(c) && (c as number) >= 0 && (c as number) < p.colors.length,
            ),
        ),
    )
    .slice(0, 100)
}

export function loadSavedPanels(): SavedPanel[] {
  try {
    return parseSavedPanels(JSON.parse(localStorage.getItem(PANEL_STORE_KEY) ?? '[]'))
  } catch {
    return []
  }
}

export function storeSavedPanels(panels: SavedPanel[]): boolean {
  try {
    localStorage.setItem(PANEL_STORE_KEY, JSON.stringify(panels))
    return true
  } catch {
    return false
  }
}
