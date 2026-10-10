/**
 * The pattern as files: a PDF booklet with the pattern tiled over A4 or Letter pages (or A0 for a copy shop, or one
 * full-size page for a plotter or projector), SVG, and DXF with the AAMA layers that pattern CAD and cutting machines
 * read.
 */
import { type CutLayout, cuttingLayout, FABRIC_WIDTHS, fabricsOf } from './cutting'
import type { Item } from './drawing'
import { type Box, bounds, type Pt } from './geometry'
import { fabricLength, formatLength, MEASUREMENTS } from './measurements'
import { FABRIC_NAMES } from './pattern'
import { bodyOf, designOf, type Project, sizeName } from './project'
import { drawSheet, layoutSheet } from './sheet'

export type Paper = 'a4' | 'letter' | 'a0' | 'full' | 'projector'

/** Paper sizes, mm. */
export const PAPERS: Record<'a4' | 'letter' | 'a0', { w: number; h: number; name: string }> = {
  a4: { w: 210, h: 297, name: 'A4' },
  letter: { w: 215.9, h: 279.4, name: 'US Letter' },
  a0: { w: 841, h: 1189, name: 'A0' },
}
/** The blank edge printers leave, mm. */
const MARGIN = 10

/** The pattern laid out to print on as few pages as can be, tiled `tile` mm across and down. */
export function tiled(p: Project, tile: { w: number; h: number }) {
  const sheet = drawSheet(p)
  let best: ReturnType<typeof layoutSheet> & { cols: number; rows: number; pages: number } = {
    ...layoutSheet(sheet, 1),
    cols: 0,
    rows: 0,
    pages: Infinity,
  }
  for (let cols = 1; cols <= 12; cols++) {
    const lay = layoutSheet(sheet, (cols * tile.w) / 10 - 2, 1.5)
    const c = Math.ceil((lay.box.w + 2) / (tile.w / 10))
    const r = Math.ceil((lay.box.h + 2) / (tile.h / 10))
    if (c * r < best.pages) best = { ...lay, cols: c, rows: r, pages: c * r }
  }
  return best
}

/** Which tiles have any of the pattern on them. */
export function usedTiles(items: Item[], cols: number, rows: number, tile: { w: number; h: number }, offset: Pt) {
  const used = Array.from({ length: rows }, () => new Array<boolean>(cols).fill(false))
  for (const it of items) {
    const pts = it.t === 'line' ? it.pts : [it.at]
    for (const q of pts) {
      const c = Math.floor(((q.x + offset.x) * 10) / tile.w)
      const r = Math.floor(((q.y + offset.y) * 10) / tile.h)
      if (r >= 0 && r < rows && c >= 0 && c < cols) used[r][c] = true
    }
    // Long lines cross tiles between their points.
    if (it.t === 'line')
      for (let i = 1; i < pts.length; i++) {
        const a = pts[i - 1]
        const b = pts[i]
        const n = Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 2)
        for (let k = 1; k < n; k++) {
          const x = a.x + ((b.x - a.x) * k) / n + offset.x
          const y = a.y + ((b.y - a.y) * k) / n + offset.y
          const c = Math.floor((x * 10) / tile.w)
          const r = Math.floor((y * 10) / tile.h)
          if (r >= 0 && r < rows && c >= 0 && c < cols) used[r][c] = true
        }
      }
  }
  return used
}

/** A tile's name: a letter for the row and a number for the column, as "B3". */
export const tileName = (r: number, c: number) => `${String.fromCharCode(65 + (r % 26))}${c + 1}`

/** The fabric to buy for each fabric, at the usual widths. */
export function fabricNeeds(
  p: Project,
  oneWay = false,
): { fabric: string; widths: { width: number; length: number }[] }[] {
  const pieces = drawSheet(p).pieces
  return fabricsOf(pieces).map((f) => ({
    fabric: FABRIC_NAMES[f],
    widths: (f === 'interfacing' ? [90] : FABRIC_WIDTHS.slice(1)).map((w) => ({
      width: w,
      length: cuttingLayout(pieces, p.allowances, f, w, { oneWay }).length + 10,
    })),
  }))
}

type Doc = InstanceType<typeof import('jspdf').jsPDF>

const INK: [number, number, number] = [30, 30, 40]
const MARK: [number, number, number] = [194, 24, 91]

/** Draws items (cm) on a PDF page at 1:1, (x, y) mm being the items' (0, 0). */
function drawItems(doc: Doc, items: Item[], x: number, y: number, k = 10, projector = false) {
  const ink = projector ? ([255, 255, 255] as const) : INK
  const mark = projector ? ([255, 213, 79] as const) : MARK
  for (const it of items) {
    if (it.t === 'line') {
      const colour = it.colour ? hexRgb(it.colour) : it.style === 'mark' ? mark : ink
      doc.setDrawColor(colour[0], colour[1], colour[2])
      const w = { cut: 0.35, sew: 0.2, mark: 0.3, fold: 0.25, grain: 0.25, guide: 0.15, size: 0.3, frame: 0.15 }[
        it.style
      ]
      doc.setLineWidth(w * (projector ? 2.5 : 1) * (k / 10))
      doc.setLineDashPattern(it.style === 'sew' ? [3, 2] : it.style === 'guide' ? [1.2, 1.2] : [], 0)
      it.pts.forEach((q, i) => {
        const px = x + q.x * k
        const py = y + q.y * k
        if (i === 0) doc.moveTo(px, py)
        else doc.lineTo(px, py)
      })
      if (it.closed) doc.close()
      doc.stroke()
    } else if (it.t === 'dot') {
      doc.setDrawColor(mark[0], mark[1], mark[2])
      doc.setFillColor(mark[0], mark[1], mark[2])
      doc.setLineDashPattern([], 0)
      doc.circle(x + it.at.x * k, y + it.at.y * k, it.r * k, it.filled ? 'FD' : 'S')
    } else {
      const colour = it.colour ? hexRgb(it.colour) : ink
      doc.setTextColor(colour[0], colour[1], colour[2])
      doc.setFont('helvetica', it.bold ? 'bold' : 'normal')
      // Text height (cm) to points: 1 cm of capital height is about 40 pt.
      doc.setFontSize(Math.max(4, it.size * k * 2.83 * 1.4))
      doc.text(it.text, x + it.at.x * k, y + it.at.y * k, {
        align: it.anchor === 'middle' ? 'center' : it.anchor === 'end' ? 'right' : 'left',
        baseline: 'middle',
        angle: it.angle ? (-it.angle * 180) / Math.PI : 0,
      })
    }
  }
  doc.setLineDashPattern([], 0)
}

function hexRgb(hex: string): [number, number, number] {
  const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex)
  return m ? [Number.parseInt(m[1], 16), Number.parseInt(m[2], 16), Number.parseInt(m[3], 16)] : INK
}

/** A test square to check the printer's scale. */
function testSquare(doc: Doc, x: number, y: number) {
  doc.setDrawColor(...INK)
  doc.setLineWidth(0.4)
  doc.setLineDashPattern([], 0)
  doc.rect(x, y, 100, 100)
  doc.setFontSize(9)
  doc.setTextColor(...INK)
  doc.text('10 cm', x + 50, y + 50, { align: 'center', baseline: 'middle' })
  if (x + 104 + 101.6 > doc.internal.pageSize.getWidth()) return
  doc.rect(x + 104, y, 101.6, 101.6)
  doc.text('4 inches', x + 104 + 50.8, y + 50.8, { align: 'center', baseline: 'middle' })
}

/** The booklet's text: what's in the pattern, for the PDF's first pages and for checking. */
export function patternText(p: Project, name: string) {
  const d = designOf(p)
  const body = bodyOf(p)
  const u = p.units
  const opts = d.options
    .filter((o) => !o.when || o.when(p.options))
    .map((o) => {
      const v = p.options[o.id]
      if (o.type === 'choice') return `${o.label}: ${o.choices.find((c) => c.value === v)?.label ?? v}`
      if (o.type === 'bool') return `${o.label}: ${v ? 'yes' : 'no'}`
      return `${o.label}: ${o.unit === 'cm' ? formatLength(Number(v), u) : `${v}${o.unit}`}`
    })
  return {
    title: name || d.name,
    subtitle: `${d.name} · ${sizeName(p)}`,
    about: d.about,
    options: opts,
    measurements: d.measurements.map((id) => `${MEASUREMENTS[id].name}: ${formatLength(body.m[id], u)}`),
    allowances: p.allowances.include
      ? `Seam allowances of ${formatLength(p.allowances.seam, u)} and hems of ${formatLength(p.allowances.hem, u)} are included. The dashed line is the sewing line.`
      : 'No seam allowances are included: add them when you cut. The solid line is the sewing line.',
    fabrics: d.fabrics,
    needs: fabricNeeds(p).map(
      (f) =>
        `${f.fabric}: ${f.widths.map((w) => `${fabricLength(w.length, u)} of ${formatLength(w.width, u).replace(' cm', ' cm wide').replace('″', '″ wide')}`).join(', ')}`,
    ),
    materials: d.materials(body, p.options),
    steps: d.steps(p.options),
  }
}

/** The pattern as a PDF: the booklet pages, then the pattern tiled across pages (or on one page). */
export async function patternPdf(p: Project, name: string, paper: Paper): Promise<Blob> {
  const { jsPDF } = await import('jspdf')
  const big = paper === 'full' || paper === 'projector'
  const page = big ? null : PAPERS[paper]
  const t = patternText(p, name)
  const doc = new jsPDF({ unit: 'mm', format: page ? [page.w, page.h] : 'a4' })
  const W = doc.internal.pageSize.getWidth()
  const H = doc.internal.pageSize.getHeight()
  const M = 18
  let y = M

  const heading = (text: string) => {
    if (y > H - 40) {
      doc.addPage()
      y = M
    }
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(13)
    doc.setTextColor(...INK)
    doc.text(text, M, y)
    y += 7
  }
  const para = (text: string, opts: { size?: number; bold?: boolean; indent?: number; bullet?: string } = {}) => {
    doc.setFont('helvetica', opts.bold ? 'bold' : 'normal')
    doc.setFontSize(opts.size ?? 10.5)
    doc.setTextColor(...INK)
    const indent = opts.indent ?? 0
    const lines = doc.splitTextToSize(text, W - M * 2 - indent) as string[]
    for (const [i, line] of lines.entries()) {
      if (y > H - M) {
        doc.addPage()
        y = M
      }
      if (i === 0 && opts.bullet) doc.text(opts.bullet, M + indent - 6, y)
      doc.text(line, M + indent, y)
      y += (opts.size ?? 10.5) * 0.45
    }
    y += 1.5
  }

  // The booklet (not with copy-shop or projector files): what it is, sizes, materials, fabric, the test square, how
  // to cut and sew it.
  const booklet = paper === 'a4' || paper === 'letter' || paper === 'full'
  if (booklet) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(24)
    doc.setTextColor(...INK)
    doc.text(t.title, M, y + 6)
    y += 14
    para(t.subtitle, { size: 12 })
    para(t.about)
    heading('Style')
    for (const o of t.options) para(o, { bullet: '•', indent: 6 })
    if (t.measurements.length) {
      heading(p.sizing === 'custom' ? 'Your measurements' : `Body measurements for ${p.size}`)
      for (const m of t.measurements) para(m, { bullet: '•', indent: 6 })
    }
    heading('Fabric')
    para(`Suggested: ${t.fabrics}`)
    for (const n of t.needs) para(n, { bullet: '•', indent: 6 })
    heading('You will also need')
    for (const m of t.materials) para(m, { bullet: '•', indent: 6 })
    heading('Seam allowances')
    para(t.allowances)
    if (page) {
      heading('Check the scale')
      para(
        'Print the pattern pages at 100% ("actual size"), not "fit to page". Measure these squares: if they are the wrong size, check the printer settings.',
      )
      if (y + 106 > H - M) {
        doc.addPage()
        y = M
      }
      testSquare(doc, M, y)
      y += 108
    }
    doc.addPage()
    y = M
    heading('Cutting')
    para(
      'Fold the fabric selvedge to selvedge, right sides together, unless the layout shows a single layer. Lay the pieces with their grainlines along the selvedge and the "place on fold" edges on the fold. Cut out, and snip the notches.',
    )
    const pieces = drawSheet(p).pieces
    for (const f of fabricsOf(pieces)) {
      const lay = cuttingLayout(pieces, p.allowances, f, f === 'interfacing' ? 90 : 140, { oneWay: false })
      if (!lay.placements.length) continue
      const scaleK = Math.min((W - M * 2) / lay.length, 60 / lay.width)
      const h = lay.width * scaleK * (lay.folded ? 0.5 : 1)
      if (y + h + 12 > H - M) {
        doc.addPage()
        y = M
      }
      para(
        `${FABRIC_NAMES[f]}, ${formatLength(lay.width, p.units)} wide${lay.folded ? ', folded' : ', single layer'}: ${fabricLength(lay.length + 10, p.units)}`,
        { bold: true, size: 10 },
      )
      drawLayout(doc, lay, M, y, scaleK)
      y += h + 8
    }
    heading('Sewing')
    for (const [i, s] of t.steps.entries()) para(s, { bullet: `${i + 1}.`, indent: 7 })
  }

  // The pattern itself.
  if (big) {
    const sheet = drawSheet(p)
    const lay = layoutSheet(sheet, 140, 2)
    const pw = (lay.box.w + 4) * 10
    const ph = (lay.box.h + 4) * 10
    doc.addPage([pw, ph], pw > ph ? 'landscape' : 'portrait')
    if (paper === 'projector') {
      doc.setFillColor(0, 0, 0)
      doc.rect(0, 0, pw, ph, 'F')
    }
    drawItems(doc, lay.items, 20, 20, 10, paper === 'projector')
  } else if (page) {
    const tile = { w: page.w - MARGIN * 2, h: page.h - MARGIN * 2 }
    const lay = tiled(p, tile)
    const offset = { x: 1, y: 1 }
    const used = usedTiles(lay.items, lay.cols, lay.rows, tile, offset)
    // A map of the pages, to tape them together (in the booklet: copy shops just print the sheets).
    if (booklet) {
      doc.addPage()
      y = M
      heading('Putting the pages together')
      para(
        `Print the ${used.flat().filter(Boolean).length} pattern pages at 100%. Trim each page along its frame on the right and bottom, and tape them together in rows and columns, matching the letters and numbers and the lines.`,
      )
      const mapScale = Math.min((W - M * 2) / (lay.cols * tile.w), (H - y - M) / (lay.rows * tile.h))
      for (let r = 0; r < lay.rows; r++)
        for (let c = 0; c < lay.cols; c++) {
          const x0 = M + c * tile.w * mapScale
          const y0 = y + r * tile.h * mapScale
          doc.setDrawColor(...INK)
          doc.setLineWidth(0.3)
          doc.setFillColor(used[r][c] ? 255 : 235, used[r][c] ? 255 : 235, used[r][c] ? 255 : 235)
          doc.rect(x0, y0, tile.w * mapScale, tile.h * mapScale, 'FD')
          if (used[r][c]) {
            doc.setFontSize(8)
            doc.setTextColor(...INK)
            doc.text(tileName(r, c), x0 + 2, y0 + 4)
          }
        }
      doc.saveGraphicsState()
      drawItems(
        doc,
        lay.items.filter((it) => it.t !== 'text'),
        M + offset.x * 10 * mapScale,
        y + offset.y * 10 * mapScale,
        10 * mapScale,
      )
      doc.restoreGraphicsState()
    }
    for (let r = 0; r < lay.rows; r++)
      for (let c = 0; c < lay.cols; c++) {
        if (!used[r][c]) continue
        doc.addPage([page.w, page.h], page.w > page.h ? 'landscape' : 'portrait')
        doc.saveGraphicsState()
        doc.rect(MARGIN, MARGIN, tile.w, tile.h)
        doc.clip()
        doc.discardPath()
        drawItems(doc, lay.items, MARGIN - c * tile.w + offset.x * 10, MARGIN - r * tile.h + offset.y * 10)
        doc.restoreGraphicsState()
        // The frame, the page's name, and its neighbours' names at each edge to match.
        doc.setDrawColor(150, 150, 160)
        doc.setLineWidth(0.2)
        doc.setLineDashPattern([], 0)
        doc.rect(MARGIN, MARGIN, tile.w, tile.h)
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(9)
        doc.setTextColor(120, 120, 130)
        doc.text(tileName(r, c), MARGIN + 2, MARGIN - 3)
        doc.setFont('helvetica', 'normal')
        doc.text(`${t.title} · ${t.subtitle}`, page.w - MARGIN, MARGIN - 3, { align: 'right' })
        if (c + 1 < lay.cols) doc.text(`${tileName(r, c + 1)} →`, page.w - MARGIN - 1, page.h / 2, { align: 'right' })
        if (r + 1 < lay.rows) doc.text(`↓ ${tileName(r + 1, c)}`, page.w / 2, page.h - MARGIN + 5, { align: 'center' })
        if (r === 0 && c === 0) {
          // A small test square on the first pattern page too.
          doc.setDrawColor(...INK)
          doc.setLineWidth(0.3)
          doc.rect(page.w - MARGIN - 52, page.h - MARGIN - 52, 50, 50)
          doc.setFontSize(8)
          doc.setTextColor(...INK)
          doc.text('5 cm', page.w - MARGIN - 27, page.h - MARGIN - 27, { align: 'center', baseline: 'middle' })
        }
      }
  }
  // Without a booklet, the blank first page isn't needed.
  if (!booklet && doc.getNumberOfPages() > 1) doc.deletePage(1)
  return doc.output('blob')
}

/** A cutting layout drawn small on a PDF page. */
function drawLayout(doc: Doc, lay: CutLayout, x: number, y: number, k: number) {
  const h = lay.width * (lay.folded ? 0.5 : 1)
  doc.setDrawColor(...INK)
  doc.setFillColor(240, 240, 246)
  doc.setLineWidth(0.3)
  doc.rect(x, y, lay.length * k, h * k, 'FD')
  doc.setFillColor(255, 255, 255)
  for (const pl of lay.placements) {
    for (const [i, q] of pl.pts.entries()) {
      if (i === 0) doc.moveTo(x + q.x * k, y + q.y * k)
      else doc.lineTo(x + q.x * k, y + q.y * k)
    }
    doc.close()
    doc.fillStroke()
    const b = bounds(pl.pts)
    doc.setFontSize(6)
    doc.setTextColor(...INK)
    doc.text(pl.piece.name, x + (b.x + b.w / 2) * k, y + (b.y + b.h / 2) * k, { align: 'center', baseline: 'middle' })
  }
  doc.setFontSize(6)
  doc.text(lay.folded ? 'fold' : 'selvedge', x + 1, y - 1)
}

/** The pattern as one full-size SVG (in cm), every piece laid out. */
export function patternSvg(p: Project, name: string, svgItems: (items: Item[]) => string): string {
  const lay = layoutSheet(drawSheet(p), 140, 2)
  const w = lay.box.w + 4
  const h = lay.box.h + 4
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${w}cm" height="${h}cm" viewBox="-2 -2 ${w} ${h}">
<title>${name.replace(/[<&]/g, '')}</title>
<rect x="-2" y="-2" width="${w}" height="${h}" fill="#fff"/>
<g font-family="Helvetica, Arial, sans-serif">
${svgItems(lay.items)}
</g>
</svg>
`
}

/**
 * The pattern as DXF (R12, millimetres), with the AAMA layer numbers: 1 cutting lines, 14 sewing lines, 7 grainlines,
 * 6 fold (mirror) lines, 8 internal lines (darts and guides), 4 notches and 15 text.
 */
export function patternDxf(p: Project): string {
  const lay = layoutSheet(drawSheet(p), 140, 2)
  const out: string[] = []
  const pair = (code: number, value: string | number) => out.push(String(code), String(value))
  const box: Box = lay.box
  const X = (x: number) => (x * 10).toFixed(2)
  // DXF's y runs up.
  const Y = (y: number) => ((box.h - y) * 10).toFixed(2)
  pair(0, 'SECTION')
  pair(2, 'HEADER')
  pair(9, '$INSUNITS')
  pair(70, 4)
  pair(0, 'ENDSEC')
  pair(0, 'SECTION')
  pair(2, 'ENTITIES')
  const layerOf = (it: Item): string => {
    if (it.t === 'text') return '15'
    if (it.t === 'dot') return '8'
    return { cut: '1', sew: '14', grain: '7', fold: '6', mark: '8', guide: '8', size: '1', frame: '8' }[it.style]
  }
  for (const it of lay.items) {
    if (it.t === 'line') {
      if (it.style === 'size') continue
      const notch =
        it.style === 'mark' &&
        it.pts.length === 2 &&
        Math.hypot(it.pts[1].x - it.pts[0].x, it.pts[1].y - it.pts[0].y) < 3
      pair(0, 'POLYLINE')
      pair(8, notch ? '4' : layerOf(it))
      pair(66, 1)
      pair(70, it.closed ? 1 : 0)
      for (const q of it.pts) {
        pair(0, 'VERTEX')
        pair(8, notch ? '4' : layerOf(it))
        pair(10, X(q.x))
        pair(20, Y(q.y))
      }
      pair(0, 'SEQEND')
    } else if (it.t === 'dot') {
      pair(0, 'CIRCLE')
      pair(8, layerOf(it))
      pair(10, X(it.at.x))
      pair(20, Y(it.at.y))
      pair(40, (it.r * 10).toFixed(2))
    } else {
      pair(0, 'TEXT')
      pair(8, '15')
      pair(10, X(it.at.x))
      pair(20, Y(it.at.y))
      pair(40, (it.size * 10).toFixed(2))
      pair(1, it.text)
      if (it.angle) pair(50, ((-it.angle * 180) / Math.PI).toFixed(2))
    }
  }
  pair(0, 'ENDSEC')
  pair(0, 'EOF')
  return `${out.join('\n')}\n`
}
