import { useEffect, useRef } from 'react'
import { type KnitChart, rowsOf, widthOf } from './chart'
import { NO_STITCH, shade } from './render'

/** A small picture of a chart: each square in its colour, purls and other stitches dotted, row 1 at the bottom. */
export function KnitThumb({ chart, size = 56 }: { chart: KnitChart; size?: number }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const ctx = ref.current?.getContext('2d')
    if (!ctx) return
    const w = widthOf(chart)
    const rows = rowsOf(chart)
    const px = 3
    ctx.canvas.width = w * px
    ctx.canvas.height = rows * px
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < w; c++) {
        const s = chart.stitch[r][c]
        const bg = s === 'none' ? NO_STITCH : chart.colors[chart.color[r][c]]
        const y = (rows - 1 - r) * px
        ctx.fillStyle = bg
        ctx.fillRect(c * px, y, px, px)
        if (s !== 'k' && s !== 'none') {
          ctx.fillStyle = shade(bg, -0.5)
          ctx.fillRect(c * px + 1, y + 1, 1, 1)
        }
      }
  }, [chart])
  return (
    <canvas
      ref={ref}
      style={{
        width: size,
        height: size,
        objectFit: 'contain',
        imageRendering: 'pixelated',
        borderRadius: 4,
        flexShrink: 0,
      }}
    />
  )
}
