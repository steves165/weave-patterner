/** A ball of yarn with two knitting needles through it. */
export function KnitMark({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" focusable="false">
      <g stroke="#d7b48a" strokeWidth={1.8} strokeLinecap="round">
        <line x1={8} y1={3} x2={27} y2={27} />
        <line x1={24} y1={3} x2={5} y2={27} />
      </g>
      <g fill="#d7b48a">
        <circle cx={8} cy={3} r={2} />
        <circle cx={24} cy={3} r={2} />
      </g>
      <circle cx={16} cy={19} r={9} fill="currentColor" />
      {/* The wraps of yarn, in mid grey so they show on a light or a dark ball. */}
      <path
        d="M8.5 15c4 2 11 2 15 0M7.5 19.5c5 2.5 12 2.5 17 0M9 24c4 2 10 2 14 0M12 11c-2 4-2 12 1 16"
        fill="none"
        stroke="#8a8a8a"
        strokeWidth={1.1}
      />
      <path d="M24 25c2 2 4 2 6 4" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" />
    </svg>
  )
}

/**
 * The Knit Patterner logo for the app bar: the yarn and needles, the name, and a strip of knitted stitches
 * underneath. Uses the current text colour, so it sits on the app bar in either theme.
 */
export function KnitLogo({ compact = false }: { compact?: boolean }) {
  // Two rows of knit Vs, as wide as the name.
  const vs = Array.from({ length: 23 }, (_, c) => c)
  return (
    <a
      href="./"
      aria-label="Knit Patterner"
      style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'inherit', textDecoration: 'none' }}
    >
      <KnitMark size={compact ? 30 : 36} />
      {!compact && (
        <span style={{ display: 'inline-flex', flexDirection: 'column', lineHeight: 1 }}>
          <span style={{ fontSize: 21, letterSpacing: 0.3, whiteSpace: 'nowrap' }}>
            <span style={{ fontWeight: 800 }}>Knit</span> <span style={{ fontWeight: 400 }}>Patterner</span>
          </span>
          <svg width="100%" height={7} viewBox="0 0 138 7" preserveAspectRatio="none" aria-hidden="true">
            {vs.map((c) => (
              <path
                key={c}
                d={`M${c * 6} 0.5 L${c * 6 + 3} 6.5 L${c * 6 + 6} 0.5`}
                fill="none"
                stroke="currentColor"
                strokeOpacity={c % 2 ? 0.55 : 0.9}
                strokeWidth={1.6}
              />
            ))}
          </svg>
        </span>
      )}
    </a>
  )
}
