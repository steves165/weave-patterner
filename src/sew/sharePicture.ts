import type { DesignPainter } from '../shareImage'
import { bounds } from './geometry'
import type { Sketch } from './pattern'

/** Paints a garment's sketch into the share picture's box: the fabric colour, outlines and stitching, on white. */
export function sketchPainter(sketch: Sketch, colour: string): DesignPainter {
  return (ctx, x, y, w, h) => {
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(x, y, w, h)
    const b = bounds([...sketch.shapes.flatMap((s) => s.pts), ...sketch.lines.flatMap((l) => l.pts)])
    const k = Math.min((w * 0.84) / b.w, (h * 0.84) / b.h)
    const ox = x + (w - b.w * k) / 2 - b.x * k
    const oy = y + (h - b.h * k) / 2 - b.y * k
    const line = Math.max(1.5, Math.min(w, h) / 220)
    const trace = (pts: { x: number; y: number }[]) => {
      ctx.beginPath()
      for (const [i, q] of pts.entries()) {
        if (i) ctx.lineTo(ox + q.x * k, oy + q.y * k)
        else ctx.moveTo(ox + q.x * k, oy + q.y * k)
      }
    }
    ctx.lineJoin = 'round'
    ctx.lineCap = 'round'
    ctx.strokeStyle = '#1e1e2a'
    for (const s of sketch.shapes) {
      trace(s.pts)
      ctx.closePath()
      ctx.fillStyle = s.fill === 'lining' ? '#f3e5f5' : s.fill === 'contrast' ? '#ffe082' : colour
      ctx.fill()
      ctx.lineWidth = line * 1.4
      ctx.setLineDash([])
      ctx.stroke()
    }
    for (const l of sketch.lines) {
      trace(l.pts)
      ctx.lineWidth = line * 0.8
      ctx.setLineDash(l.dash ? [line * 3, line * 2] : [])
      ctx.stroke()
    }
    ctx.setLineDash([])
    ctx.fillStyle = '#1e1e2a'
    for (const d of sketch.dots ?? []) {
      ctx.beginPath()
      ctx.arc(ox + d.x * k, oy + d.y * k, line * 2.5, 0, 2 * Math.PI)
      ctx.fill()
    }
  }
}
