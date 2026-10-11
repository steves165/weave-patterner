import type { SheetLayout } from './layout'
import { drawSheet, type Painter } from './render'

/** Millimetres to points, for font sizes. */
const PT = 72 / 25.4

/** The sheet as a one-page PDF, at full size, ready to print. */
export async function sheetPdf(l: SheetLayout): Promise<Blob> {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({
    unit: 'mm',
    format: [l.page.w, l.page.h],
    orientation: l.page.landscape ? 'landscape' : 'portrait',
  })
  const painter: Painter = {
    fillRect(x, y, w, h, colour) {
      // The page is white already.
      if (colour.toLowerCase() === '#ffffff') return
      doc.setFillColor(colour)
      doc.rect(x, y, w, h, 'F')
    },
    line(x1, y1, x2, y2, colour, width) {
      doc.setDrawColor(colour)
      doc.setLineWidth(width)
      doc.line(x1, y1, x2, y2)
    },
    text(t, x, y, size, opts = {}) {
      doc.setFont('helvetica', opts.bold ? 'bold' : 'normal')
      doc.setFontSize(size * PT)
      doc.setTextColor(opts.colour ?? '#000000')
      // The PDF's built-in fonts have no curly quotes.
      doc.text(t.replace(/[‘’]/g, "'").replace(/[“”]/g, '"'), x, y, { align: opts.align ?? 'left' })
    },
  }
  drawSheet(painter, l)
  return doc.output('blob')
}
