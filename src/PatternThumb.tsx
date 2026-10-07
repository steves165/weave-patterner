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
    for (let p = 0; p < draft.picks; p++) {
      for (let e = 0; e < draft.ends; e++) {
        ctx.fillStyle = dd[p][e] ? draft.warpColors[e] : draft.weftColors[p]
        ctx.fillRect(e, p, 1, 1)
      }
    }
  }, [draft])

  return (
    <canvas
      ref={ref}
      style={{
        width: size,
        height: size,
        imageRendering: 'pixelated',
        borderRadius: 4,
        flexShrink: 0,
      }}
    />
  )
}
