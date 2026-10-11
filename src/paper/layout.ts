/**
 * Paper patterns: a sheet to print, colour in by hand, and scan or photograph back in. This is the sheet's layout,
 * in millimetres from the top left of the page, worked out from a few settings alone (the paper, and the grid's size),
 * so the scanner can rebuild exactly the same layout from the settings in the sheet's QR code.
 */

export type PaperSize = 'a4' | 'letter' | 'a3'

export const PAPERS: Record<PaperSize, { w: number; h: number; name: string }> = {
  a4: { w: 210, h: 297, name: 'A4' },
  letter: { w: 215.9, h: 279.4, name: 'US Letter' },
  a3: { w: 297, h: 420, name: 'A3' },
}

/** What the sheet is for. */
export type SheetKind = 'drawdown'

/** The settings a sheet is made from, and that its QR code carries. */
export interface SheetSpec {
  kind: SheetKind
  name: string
  /** Columns (ends) and rows (picks) of the grid. */
  ends: number
  picks: number
  paper: PaperSize
}

export interface Box {
  x: number
  y: number
  w: number
  h: number
}

export interface SheetLayout {
  spec: SheetSpec
  /** The page, turned to landscape when that gives bigger squares. */
  page: { w: number; h: number; landscape: boolean }
  /** The four solid squares in the corners, which the scanner lines the page up by: top left, top right, bottom right, bottom left. */
  marks: Box[]
  /** The QR code (its modules, without the quiet zone). */
  qr: Box
  /** The title and instructions. */
  title: { x: number; y: number }
  /** The grid: its top left, and each square's size. Row 0 is the top row (pick 1 is drawn at the top). */
  grid: { x: number; y: number; cell: number }
  /** The strips for the warp colours (a square above each column) and weft colours (one right of each row). */
  warpStrip: { x: number; y: number }
  weftStrip: { x: number; y: number }
  /** A 100 mm scale, to check the print. */
  scale: { x: number; y: number; length: number }
}

export const MARGIN = 10
export const MARK = 9
/** The QR code's size, and the room kept clear round it. */
export const QR = 30
const QUIET = 3
/** Squares smaller than this are too fiddly to colour in, and to read back. */
export const MIN_CELL = 3.5
const MAX_CELL = 10
/** The gap between the grid and its colour strips. */
const STRIP_GAP = 2.5
/** Room for the numbers along the top and left of the grid. */
const LABELS = 6

export const MAX_SQUARES = 200

/** The sheet's layout for its settings, or an error saying why it won't fit. */
export function sheetLayout(spec: SheetSpec): SheetLayout {
  if (!Number.isInteger(spec.ends) || !Number.isInteger(spec.picks) || spec.ends < 2 || spec.picks < 2)
    throw new Error('The grid needs at least 2 squares each way')
  if (spec.ends > MAX_SQUARES || spec.picks > MAX_SQUARES)
    throw new Error(`The grid can be up to ${MAX_SQUARES} squares each way`)
  const paper = PAPERS[spec.paper]
  const fit = (w: number, h: number) => {
    // Header: the title beside the top marks and the QR code; footer: the scale beside the bottom marks.
    const top = MARGIN + QR + QUIET + 2
    const bottom = h - MARGIN - MARK - 4
    const left = MARGIN + LABELS
    const right = w - MARGIN
    const across = (right - left - STRIP_GAP) / (spec.ends + 1)
    const down = (bottom - top - LABELS - STRIP_GAP) / (spec.picks + 1)
    return { cell: Math.min(MAX_CELL, across, down), top, left }
  }
  const portrait = fit(paper.w, paper.h)
  const landscape = fit(paper.h, paper.w)
  const useLandscape = landscape.cell > portrait.cell + 0.25
  const { cell: raw, top, left } = useLandscape ? landscape : portrait
  if (raw < MIN_CELL)
    throw new Error(
      `${spec.ends} × ${spec.picks} squares would be under ${MIN_CELL} mm on ${paper.name}: choose bigger paper or fewer squares`,
    )
  // Whole tenths of a millimetre, so the print and the scanner agree exactly.
  const cell = Math.floor(raw * 10) / 10
  const page = useLandscape ? { w: paper.h, h: paper.w, landscape: true } : { w: paper.w, h: paper.h, landscape: false }
  const gridW = spec.ends * cell
  const warpStrip = { x: left, y: top + LABELS }
  const grid = { x: left, y: warpStrip.y + cell + STRIP_GAP, cell }
  return {
    spec,
    page,
    marks: [
      { x: MARGIN, y: MARGIN, w: MARK, h: MARK },
      { x: page.w - MARGIN - MARK, y: MARGIN, w: MARK, h: MARK },
      { x: page.w - MARGIN - MARK, y: page.h - MARGIN - MARK, w: MARK, h: MARK },
      { x: MARGIN, y: page.h - MARGIN - MARK, w: MARK, h: MARK },
    ],
    qr: { x: page.w - MARGIN - MARK - QUIET - QR, y: MARGIN, w: QR, h: QR },
    title: { x: MARGIN + MARK + 4, y: MARGIN + 4 },
    grid,
    warpStrip,
    weftStrip: { x: grid.x + gridW + STRIP_GAP, y: grid.y },
    scale: { x: MARGIN + MARK + 6, y: page.h - MARGIN - MARK / 2, length: 100 },
  }
}

/** The centre of each corner mark, in order: top left, top right, bottom right, bottom left. */
export const markCentres = (l: SheetLayout) => l.marks.map((m) => ({ x: m.x + m.w / 2, y: m.y + m.h / 2 }))

/** The centre of grid square (row, col), and of the colour strips' squares. */
export const cellCentre = (l: SheetLayout, row: number, col: number) => ({
  x: l.grid.x + (col + 0.5) * l.grid.cell,
  y: l.grid.y + (row + 0.5) * l.grid.cell,
})
export const warpStripCentre = (l: SheetLayout, col: number) => ({
  x: l.warpStrip.x + (col + 0.5) * l.grid.cell,
  y: l.warpStrip.y + 0.5 * l.grid.cell,
})
export const weftStripCentre = (l: SheetLayout, row: number) => ({
  x: l.weftStrip.x + 0.5 * l.grid.cell,
  y: l.weftStrip.y + (row + 0.5) * l.grid.cell,
})

/** The text in the QR code: a short tag and version, then the settings. */
const TAG = 'WPPAPER1'

export function encodeSpec(s: SheetSpec): string {
  return [TAG, s.kind, s.paper, s.ends, s.picks, encodeURIComponent(s.name.slice(0, 60))].join(';')
}

/** The settings from a QR code's text, or null when it isn't one of these sheets. */
export function decodeSpec(text: string): SheetSpec | null {
  const [tag, kind, paper, ends, picks, ...rest] = text.split(';')
  if (tag !== TAG || kind !== 'drawdown' || !(paper in PAPERS)) return null
  const e = Number(ends)
  const p = Number(picks)
  if (!Number.isInteger(e) || !Number.isInteger(p) || e < 2 || p < 2 || e > MAX_SQUARES || p > MAX_SQUARES) return null
  let name = 'Paper pattern'
  try {
    name = decodeURIComponent(rest.join(';')) || name
  } catch {
    // keep the default
  }
  return { kind, paper: paper as PaperSize, ends: e, picks: p, name }
}
