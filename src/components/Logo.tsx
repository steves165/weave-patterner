import { TWILL_STEPS } from '../marks'
import { DISPLAY_FONT } from '../theme'

/**
 * The Weave Patterner mark: a rounded square in the accent colour with a twill line stepping down it in light
 * squares. The same drawing as public/favicon.svg.
 */
export function WeaveMark({ size = 30 }: { size?: number }) {
  return (
    <svg
      className="brand-mark"
      width={size}
      height={size}
      viewBox="0 0 30 30"
      aria-hidden="true"
      focusable="false"
      style={{ flex: 'none' }}
    >
      <rect width={30} height={30} rx={9} fill="var(--wp-accent, #D6246E)" />
      <g fill="var(--mui-palette-primary-contrastText, #FFFFFF)">
        {TWILL_STEPS.map(([x, y], i) => (
          <rect
            key={`${x}-${y}`}
            className="stitch"
            style={{ ['--i' as string]: i }}
            x={x}
            y={y}
            width={4}
            height={4}
            rx={1.3}
          />
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
