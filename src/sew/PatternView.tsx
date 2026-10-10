import { memo, type ReactNode } from 'react'
import { type Item, SIZE_COLOURS } from './drawing'
import type { Box } from './geometry'

/** CSS pixels in a centimetre, as browsers count them (96 to the inch): close to life size on most screens. */
export const CSS_PX_PER_CM = 96 / 2.54

const STROKES: Record<string, { width: number; dash?: string; colour: string }> = {
  cut: { width: 0.06, colour: 'var(--sew-ink)' },
  sew: { width: 0.03, dash: '0.4 0.25', colour: 'var(--sew-ink)' },
  mark: { width: 0.045, colour: 'var(--sew-mark)' },
  fold: { width: 0.04, colour: 'var(--sew-ink)' },
  grain: { width: 0.04, colour: 'var(--sew-ink)' },
  guide: { width: 0.025, dash: '0.15 0.15', colour: 'var(--sew-ink)' },
  size: { width: 0.045, colour: 'var(--sew-ink)' },
  frame: { width: 0.02, colour: 'var(--sew-ink)' },
}

/** Drawing items as SVG elements (centimetre units), coloured by the page's --sew-ink and --sew-mark. */
export function ItemsSvg({ items, minStroke = 0 }: { items: Item[]; minStroke?: number }): ReactNode {
  return items.map((it, i) => {
    if (it.t === 'line') {
      const s = STROKES[it.style]
      const pts = it.pts.map((q) => `${q.x.toFixed(2)},${q.y.toFixed(2)}`).join(' ')
      const props = {
        points: pts,
        fill: 'none',
        stroke: it.colour ?? s.colour,
        strokeWidth: Math.max(s.width, minStroke * (it.style === 'cut' ? 2 : 1)),
        strokeDasharray: s.dash,
        strokeLinejoin: 'round' as const,
        className: `sew-${it.style}`,
      }
      // biome-ignore lint/suspicious/noArrayIndexKey: a fixed drawing, redrawn whole
      return it.closed ? <polygon key={i} {...props} /> : <polyline key={i} {...props} />
    }
    if (it.t === 'dot')
      return (
        <circle
          // biome-ignore lint/suspicious/noArrayIndexKey: a fixed drawing
          key={i}
          cx={it.at.x}
          cy={it.at.y}
          r={it.r}
          fill={it.filled ? 'var(--sew-mark)' : 'none'}
          stroke="var(--sew-mark)"
          strokeWidth={0.04}
        />
      )
    return (
      <text
        // biome-ignore lint/suspicious/noArrayIndexKey: a fixed drawing
        key={i}
        x={it.at.x}
        y={it.at.y}
        fontSize={it.size}
        textAnchor={it.anchor ?? 'start'}
        dominantBaseline="middle"
        fontWeight={it.bold ? 700 : 400}
        fill={it.colour ?? 'var(--sew-ink)'}
        transform={it.angle ? `rotate(${(it.angle * 180) / Math.PI} ${it.at.x} ${it.at.y})` : undefined}
      >
        {it.text}
      </text>
    )
  })
}

/** The pattern pieces laid out on paper, `scale` CSS px to the cm. */
export const PatternView = memo(function PatternView({
  items,
  box,
  scale,
  label,
  grid,
}: {
  items: Item[]
  box: Box
  scale: number
  label: string
  /** A 5 cm grid behind the pieces, as on a cutting mat. */
  grid?: boolean
}) {
  const pad = 2
  const w = box.w + pad * 2
  const h = box.h + pad * 2
  return (
    <svg
      role="img"
      aria-label={label}
      className="sew-pattern"
      width={Math.round(w * scale)}
      height={Math.round(h * scale)}
      viewBox={`${box.x - pad} ${box.y - pad} ${w} ${h}`}
      style={{ display: 'block', fontFamily: "'Nunito Variable', Nunito, sans-serif" }}
    >
      <rect x={box.x - pad} y={box.y - pad} width={w} height={h} fill="var(--sew-paper)" />
      {grid && (
        <>
          <defs>
            <pattern id="sew-grid" width={5} height={5} patternUnits="userSpaceOnUse" x={box.x - pad} y={box.y - pad}>
              <path d="M5 0 L0 0 0 5" fill="none" stroke="var(--sew-grid)" strokeWidth={0.03} />
            </pattern>
          </defs>
          <rect x={box.x - pad} y={box.y - pad} width={w} height={h} fill="url(#sew-grid)" />
        </>
      )}
      {/* Thin lines stay visible when the pattern is shown small. */}
      <ItemsSvg items={items} minStroke={0.6 / scale} />
    </svg>
  )
})

/** A key to the nested sizes' colours. */
export function SizeKey({ names, current }: { names: string[]; current: string }) {
  return (
    <span style={{ display: 'inline-flex', flexWrap: 'wrap', gap: 12, fontSize: 13 }} data-testid="size-key">
      <span>
        <span
          style={{
            display: 'inline-block',
            width: 18,
            borderTop: '2px solid var(--sew-ink)',
            verticalAlign: 'middle',
            marginRight: 6,
          }}
        />
        {current}
      </span>
      {names.map((n, i) => (
        <span key={n}>
          <span
            style={{
              display: 'inline-block',
              width: 18,
              borderTop: `2px solid ${SIZE_COLOURS[i % SIZE_COLOURS.length]}`,
              verticalAlign: 'middle',
              marginRight: 6,
            }}
          />
          {n}
        </span>
      ))}
    </span>
  )
}
