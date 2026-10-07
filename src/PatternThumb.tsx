import { useEffect, useRef } from 'react'
import { computeDrawdown, type Draft } from './weave'

/** A small canvas rendering of a draft's drawdown. */
export function PatternThumb({ draft, size = 56 }: { draft: Draft; size?: number }) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const ctx = ref.current?.getContext('2d')
    if (!ctx) return
    const dd = computeDrawdown(draft)
    ctx.canvas.width = draft.ends
    ctx.canvas.height = draft.picks
    dd.forEach((row, p) =>
      row.forEach((warpUp, e) => {
        ctx.fillStyle = warpUp ? draft.warpColors[e] : draft.weftColors[p]
        ctx.fillRect(e, p, 1, 1)
      }),
    )
  }, [draft])

  return (
    <canvas
      ref={ref}
      style={{ width: size, height: size, imageRendering: 'pixelated', borderRadius: 4, flexShrink: 0 }}
    />
  )
}
