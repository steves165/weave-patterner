import type { DesignPainter } from '../shareImage'
import type { KnitChart } from './chart'
import { drawFabric } from './render'

/** The knitted fabric of a chart, repeated to fill the box. `canvas` makes a scratch canvas to draw it on first. */
export function fabricPainter(k: KnitChart, canvas: () => HTMLCanvasElement): DesignPainter {
  return (ctx, x, y, w, h) => {
    const stitches = k.stitch[0]?.length ?? 1
    const rows = k.stitch.length || 1
    // At least about 30 stitches across, so small charts show as a repeat.
    const stitchW = Math.min(36, Math.max(10, w / Math.max(30, stitches * 1.5)))
    const stitchH = (stitchW * k.gauge.stitches) / k.gauge.rows
    const scratch = canvas().getContext('2d')
    if (!scratch) throw new Error('This browser cannot draw images')
    drawFabric(scratch, k, stitchW, Math.ceil(w / (stitches * stitchW)), Math.ceil(h / (rows * stitchH)))
    // Row 1 is at the bottom of the fabric: keep it there.
    const fabric = scratch.canvas
    ctx.drawImage(
      fabric,
      0,
      Math.max(0, fabric.height - h),
      w,
      Math.min(h, fabric.height),
      x,
      y,
      w,
      Math.min(h, fabric.height),
    )
  }
}
