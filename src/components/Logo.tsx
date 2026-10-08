import { DISPLAY_FONT } from '../theme'

/** The steps of a twill line, as [x, y] of each little square in the 30 × 30 mark. */
const STEPS = [
  [7, 7],
  [11, 7],
  [11, 11],
  [15, 11],
  [15, 15],
  [19, 15],
  [19, 19],
  [7, 19],
]

/**
 * The Weave Patterner mark: a rounded square in the accent colour with a twill line stepping down it in light
 * squares. The same drawing as public/favicon.svg.
 */
export function WeaveMark({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 30 30" aria-hidden="true" focusable="false" style={{ flex: 'none' }}>
      <rect width={30} height={30} rx={9} fill="var(--wp-accent, #D6246E)" />
      <g fill="var(--mui-palette-primary-contrastText, #FFFFFF)">
        {STEPS.map(([x, y]) => (
          <rect key={`${x}-${y}`} x={x} y={y} width={4} height={4} rx={1.3} />
        ))}
      </g>
    </svg>
  )
}

/** The logo for the app bar: the mark and the name, in the display face and the accent colour. */
export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <a
      href="./"
      aria-label="Weave Patterner"
      style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'inherit', textDecoration: 'none' }}
    >
      <WeaveMark size={compact ? 28 : 30} />
      {!compact && (
        <span
          style={{
            fontFamily: DISPLAY_FONT,
            fontSize: 24,
            fontWeight: 600,
            lineHeight: 1,
            letterSpacing: '-0.01em',
            whiteSpace: 'nowrap',
            color: 'var(--wp-accent)',
          }}
        >
          Weave Patterner
        </span>
      )}
    </a>
  )
}
