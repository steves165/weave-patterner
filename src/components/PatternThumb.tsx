import { useEffect, useRef } from 'react'
import { computeDrawdown, type Draft } from '../weave'

/**
 * A small canvas rendering of a draft's drawdown, pick 1 at the top and end 1 on the left unless `orient` says
 * otherwise (to match the draft on screen, where a twill's direction matters).
 */
export function PatternThumb({
  draft,
  size = 56,
  orient,
}: {
  draft: Draft
  size?: number
  orient?: { endOneRight: boolean; pickOneBottom: boolean }
}) {
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
        const x = orient?.endOneRight ? draft.ends - 1 - e : e
        const y = orient?.pickOneBottom ? draft.picks - 1 - p : p
        ctx.fillRect(x, y, 1, 1)
      }
    }
  }, [draft, orient?.endOneRight, orient?.pickOneBottom])

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
