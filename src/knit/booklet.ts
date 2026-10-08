import { castOn, colorLetter, type KnitChart, rowsOf, size, usedColors, widthOf } from './chart'
import { castOnText, writtenPanels, writtenRows } from './instructions'
import { intarsia } from './intarsia'
import { drawChart } from './render'
import { sizePlans } from './shaping'
import { STITCHES, type StitchId } from './stitches'
import { yarnNeeded } from './yarn'

export interface BookletOptions {
  /** The piece the yarn is worked out for, in cm, and metres in a ball. */
  width: number
  length: number
  metresPerBall: number
}

/** The booklet's sections as plain text, for the PDF and for checking. */
export function bookletText(k: KnitChart, name: string, o: BookletOptions) {
  const dims = size(k)
  const colors = usedColors(k)
  const yarn = yarnNeeded(k, o.width, o.length)
  const flat = k.mode === 'flat'
  const notes = [
    flat
      ? 'Worked flat. Right-side (odd) rows are read from right to left on the chart, wrong-side (even) rows from left to right.'
      : 'Worked in the round. Every round is read from right to left on the chart.',
    castOnText(k),
  ]
  if (colors.length > 1)
    notes.push(
      k.colorwork === 'intarsia'
        ? `Intarsia: wind ${intarsia(k).total} bobbins, one for each area of colour, and twist the yarns at each colour change.`
        : `Stranded colourwork: carry the colour not in use loosely behind, catching floats longer than ${k.floatLimit} stitches.`,
    )
  if (k.repeat) notes.push('The repeat outlined in red on the chart is worked as many times as the width needs.')
  const used = new Set<StitchId>(k.stitch.flat())
  return {
    title: name || 'Knitting pattern',
    summary: `${widthOf(k)} stitches × ${rowsOf(k)} ${flat ? 'rows' : 'rounds'} (about ${dims.width.toFixed(1)} × ${dims.height.toFixed(1)} cm), cast on ${castOn(k)}.`,
    gauge: `${k.gauge.stitches} stitches and ${k.gauge.rows} rows to 10 cm in stockinette, after blocking. Change needle size to match it.`,
    materials: yarn.map((y) => {
      const balls = Math.ceil(y.metres / Math.max(1, o.metresPerBall))
      return {
        color: k.colors[y.color],
        text: `${colors.length > 1 ? `Colour ${colorLetter(y.color)}: ` : 'Yarn: '}about ${Math.ceil(y.metres)} m (${balls} ${balls === 1 ? 'ball' : 'balls'} of ${o.metresPerBall} m)`,
      }
    }),
    materialsNote: `For a piece ${o.width} × ${o.length} cm, with 10% extra.`,
    sizes: k.sizes?.length
      ? sizePlans(k, k.sizes).map(
          (p) =>
            `${p.name}: ${p.actualWidth.toFixed(1)} × ${p.length} cm. Cast on ${p.castOn}, work ${p.rows} ${flat ? 'rows' : 'rounds'}, about ${Math.ceil(p.metres)} m.`,
        )
      : [],
    notes,
    abbreviations: [
      ...Object.values(STITCHES)
        .filter((s) => used.has(s.id))
        .map((s) => s.explain),
      ...(flat ? ['RS: right side. WS: wrong side.'] : []),
      'rep: repeat. st(s): stitch(es).',
    ],
    rows: writtenRows(k).map(
      (w) =>
        `${w.label}${w.side ? ` (${w.side})` : ''}: ${w.text}.${w.stitches === null ? '' : ` (${w.stitches} sts)`}`,
    ),
    panels: writtenPanels(k).map((p) => ({
      title: `${p.title}, ${p.stitches}`,
      rows: p.rows.map((w) => `${w.label}${w.side ? ` (${w.side})` : ''}: ${w.text}.`),
    })),
  }
}

/**
 * A pattern booklet as a PDF (A4): the title, size, gauge, materials (yarn per colour), sizes and notes; the chart
 * with its key; the abbreviations; and the written rows (and any panels), flowing over as many pages as they need,
 * with page numbers. jsPDF loads only when a booklet is made.
 */
export async function bookletPdf(k: KnitChart, name: string, o: BookletOptions): Promise<Blob> {
  const { jsPDF } = await import('jspdf')
  const t = bookletText(k, name, o)
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const [W, H, M] = [210, 297, 18]
  const accent = [0, 121, 107] as const
  let y = M

  const ensure = (h: number) => {
    if (y + h > H - M) {
      doc.addPage()
      y = M
    }
  }
  const heading = (text: string) => {
    ensure(14)
    y += 4
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(13)
    doc.setTextColor(...accent)
    doc.text(text, M, y)
    y += 7
    doc.setTextColor(30, 30, 30)
  }
  const para = (text: string, opts: { size?: number; indent?: number; bold?: boolean; gap?: number } = {}) => {
    doc.setFont('helvetica', opts.bold ? 'bold' : 'normal')
    doc.setFontSize(opts.size ?? 10.5)
    const lines = doc.splitTextToSize(text, W - M * 2 - (opts.indent ?? 0)) as string[]
    const lh = (opts.size ?? 10.5) * 0.45
    for (const line of lines) {
      ensure(lh)
      doc.text(line, M + (opts.indent ?? 0), y)
      y += lh
    }
    y += opts.gap ?? 1.5
  }

  // Title page: what it is, gauge, materials, sizes, notes.
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(24)
  doc.setTextColor(...accent)
  doc.text(t.title, M, y + 6)
  y += 14
  doc.setTextColor(90, 90, 90)
  para(t.summary, { size: 11 })
  doc.setTextColor(30, 30, 30)
  heading('Gauge')
  para(t.gauge)
  heading('Materials')
  for (const m of t.materials) {
    ensure(6)
    doc.setFillColor(m.color)
    doc.setDrawColor(120, 120, 120)
    doc.rect(M, y - 3.4, 4.5, 4.5, 'FD')
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10.5)
    doc.text(m.text, M + 7, y)
    y += 6
  }
  doc.setTextColor(110, 110, 110)
  para(t.materialsNote, { size: 9 })
  doc.setTextColor(30, 30, 30)
  if (t.sizes.length) {
    heading('Sizes')
    for (const s of t.sizes) para(s)
  }
  heading('Notes')
  for (const n of t.notes) para(n)

  // The chart and its key, as large as fits a page.
  doc.addPage()
  y = M
  heading('Chart')
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (ctx) {
    const cell = Math.max(8, Math.min(24, Math.floor(1600 / Math.max(widthOf(k), rowsOf(k)))))
    drawChart(ctx, k, { cell, cellH: cell, legend: true })
    const [maxW, maxH] = [W - M * 2, H - M - y]
    const scale = Math.min(maxW / canvas.width, maxH / canvas.height)
    doc.addImage(canvas.toDataURL('image/png'), 'PNG', M, y, canvas.width * scale, canvas.height * scale)
  }

  // Abbreviations and the written rows.
  doc.addPage()
  y = M
  heading('Abbreviations')
  for (const a of t.abbreviations) para(a, { size: 9.5 })
  heading('Instructions')
  para(castOnText(k), { bold: true })
  for (const r of t.rows) para(r, { gap: 1 })
  for (const p of t.panels) {
    heading(p.title)
    for (const r of p.rows) para(r, { gap: 1 })
  }

  // Page numbers and where it came from.
  const pages = doc.getNumberOfPages()
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    doc.setTextColor(140, 140, 140)
    doc.text(`${t.title} · page ${i} of ${pages}`, M, H - 9)
    doc.text('Made with Knit Patterner', W - M, H - 9, { align: 'right' })
  }
  return doc.output('blob')
}
