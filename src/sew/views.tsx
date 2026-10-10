import { memo } from 'react'
import type { CutLayout } from './cutting'
import { bounds, type Pt } from './geometry'
import type { Sketch } from './pattern'

const path = (pts: Pt[], closed = true) =>
  `${pts.map((q, i) => `${i ? 'L' : 'M'}${q.x.toFixed(2)} ${q.y.toFixed(2)}`).join(' ')}${closed ? ' Z' : ''}`

/** A flat sketch of the garment, as a fashion drawing: filled in the fabric colour, with its seams and stitching. */
export const SketchView = memo(function SketchView({
  sketch,
  label,
  colour = 'var(--sew-fabric)',
  height = 260,
}: {
  sketch: Sketch
  label: string
  colour?: string
  height?: number
}) {
  const b = bounds([...sketch.shapes.flatMap((s) => s.pts), ...sketch.lines.flatMap((l) => l.pts)])
  const pad = Math.max(b.w, b.h) * 0.04 + 1
  const stroke = Math.max(b.w, b.h) / 260
  return (
    <svg
      role={label ? 'img' : undefined}
      aria-label={label || undefined}
      aria-hidden={label ? undefined : true}
      viewBox={`${b.x - pad} ${b.y - pad} ${b.w + pad * 2} ${b.h + pad * 2}`}
      style={{ display: 'block', width: '100%', height, maxWidth: '100%' }}
      className="sew-sketch"
    >
      {sketch.shapes.map((s, i) => (
        <path
          // biome-ignore lint/suspicious/noArrayIndexKey: a fixed drawing
          key={i}
          d={path(s.pts)}
          fill={s.fill === 'lining' ? 'var(--sew-lining)' : s.fill === 'contrast' ? 'var(--sew-contrast)' : colour}
          stroke="var(--sew-ink)"
          strokeWidth={stroke * 1.4}
          strokeLinejoin="round"
        />
      ))}
      {sketch.lines.map((l, i) => (
        <path
          // biome-ignore lint/suspicious/noArrayIndexKey: a fixed drawing
          key={i}
          d={path(l.pts, false)}
          fill="none"
          stroke="var(--sew-ink)"
          strokeOpacity={0.75}
          strokeWidth={stroke * (l.dash ? 0.7 : 0.9)}
          strokeDasharray={l.dash ? `${stroke * 3} ${stroke * 2}` : undefined}
          strokeLinecap="round"
        />
      ))}
      {(sketch.dots ?? []).map((d) => (
        <circle key={`${d.x},${d.y}`} cx={d.x} cy={d.y} r={stroke * 2.5} fill="var(--sew-ink)" />
      ))}
    </svg>
  )
})

/** A cutting layout: the fabric (fold or selvedge at the top) and the pieces on it, named. */
export const CuttingView = memo(function CuttingView({ layout, label }: { layout: CutLayout; label: string }) {
  const h = layout.folded ? layout.width / 2 : layout.width
  const w = Math.max(layout.length, 10)
  const text = Math.max(2.2, Math.min(4, h / 18))
  return (
    <svg
      role="img"
      aria-label={label}
      viewBox={`-2 ${-text * 2} ${w + 4} ${h + text * 2 + 2}`}
      style={{ display: 'block', width: '100%', height: 'auto', maxHeight: 300 }}
      className="sew-cutting"
    >
      <rect x={0} y={0} width={w} height={h} fill="var(--sew-fabric)" stroke="var(--sew-ink)" strokeWidth={0.3} />
      <text x={0} y={-text * 0.7} fontSize={text * 0.8} fill="var(--sew-ink)">
        {layout.folded ? 'Fold' : 'Selvedge'}
      </text>
      {layout.placements.map((pl, i) => {
        const b = bounds(pl.pts)
        return (
          // biome-ignore lint/suspicious/noArrayIndexKey: placements in order
          <g key={i} data-piece={pl.piece.id}>
            <path
              d={path(pl.pts)}
              fill="var(--sew-paper)"
              stroke="var(--sew-ink)"
              strokeWidth={0.35}
              strokeLinejoin="round"
            />
            <text
              x={b.x + b.w / 2}
              y={b.y + b.h / 2}
              fontSize={Math.min(text, b.h / 3, b.w / Math.max(4, pl.piece.name.length * 0.6))}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="var(--sew-ink)"
            >
              {pl.piece.name}
            </text>
          </g>
        )
      })}
    </svg>
  )
})
