import { DISPLAY_FONT } from '../theme'

/** Each knit V of the mark: two columns of three stitches, as [x, y] of the V's top left in the 30 × 30 mark. */
const VS = [7, 15].flatMap((x) => [6.5, 12.5, 18.5].map((y) => [x, y]))

/**
 * The Knit Patterner mark, in the same style as Weave Patterner's: a rounded square in the accent colour with two
 * columns of knit stitches (Vs) in light strokes. The same drawing as public/knit/favicon.svg.
 */
export function KnitMark({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 30 30" aria-hidden="true" focusable="false" style={{ flex: 'none' }}>
      <rect width={30} height={30} rx={9} fill="var(--wp-accent, #00796B)" />
      <g
        fill="none"
        stroke="var(--mui-palette-primary-contrastText, #FFFFFF)"
        strokeWidth={2.2}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {VS.map(([x, y]) => (
          <path key={`${x}-${y}`} d={`M${x} ${y} L${x + 4} ${y + 5} L${x + 8} ${y}`} />
        ))}
      </g>
    </svg>
  )
}

/** The logo for the app bar: the mark and the name, in the display face and the accent colour. */
export function KnitLogo({ compact = false }: { compact?: boolean }) {
  return (
    <a
      href="./"
      aria-label="Knit Patterner"
      style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'inherit', textDecoration: 'none' }}
    >
      <KnitMark size={compact ? 28 : 30} />
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
          Knit Patterner
        </span>
      )}
    </a>
  )
}
