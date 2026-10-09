import { encodeBmp } from '../bmp'
import { type KnitChart, rowsOf } from './chart'

/**
 * The chart as a bitmap, one pixel per stitch as it looks on screen (row 1 at the bottom), indexed in the chart's
 * colours: colour A is index 0, B index 1 and so on, as machine-knitting software (AYAB, img2track) expects.
 */
export function chartBitmap(chart: KnitChart): Uint8Array<ArrayBuffer> {
  const rows = rowsOf(chart)
  const pixels = Array.from({ length: rows }, (_, i) => chart.color[rows - 1 - i])
  // One colour alone still needs a two-colour palette.
  const palette = chart.colors.length === 1 ? [...chart.colors, '#000000'] : chart.colors
  return encodeBmp(pixels, palette)
}
