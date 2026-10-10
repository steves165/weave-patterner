import { SEW_NEEDLE, SEW_STITCHES } from '../marks'
import { DISPLAY_FONT } from '../theme'

/**
 * The Sew Patterner mark, in the same style as the others: a rounded square in the accent colour with a needle over
 * a row of running stitches. The same drawing as public/sew/favicon.svg.
 */
export function SewMark({ size = 30 }: { size?: number }) {
  const n = SEW_NEEDLE
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
      <rect width={30} height={30} rx={9} fill="var(--wp-accent, #3949AB)" />
      <g fill="none" stroke="var(--mui-palette-primary-contrastText, #FFFFFF)" strokeWidth={2.2} strokeLinecap="round">
        <path d={`M${n.from[0]} ${n.from[1]} L${n.to[0]} ${n.to[1]}`} />
        <circle cx={n.eye[0]} cy={n.eye[1]} r={n.eyeR} />
        {SEW_STITCHES.map(([a, b, c, d], i) => (
          <path key={a} className="stitch" style={{ ['--i' as string]: i }} d={`M${a} ${b} L${c} ${d}`} />
        ))}
      </g>
    </svg>
  )
}

/** The logo for the app bar: the mark and the name, in the display face and the accent colour. */
export function SewLogo({ compact = false }: { compact?: boolean }) {
  return (
    <a
      href="./"
      aria-label="Sew Patterner"
      style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'inherit', textDecoration: 'none' }}
    >
      <SewMark size={compact ? 28 : 30} />
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
          Sew Patterner
        </span>
      )}
    </a>
  )
}
