/** A little loom: wooden frame, warp threads running down, and a strip of twill cloth at the front. */
export function LoomMark({ size = 32 }: { size?: number }) {
  // A 2/2 twill for the woven strip: which squares show dark.
  const twill = [0, 1, 2, 3, 4].flatMap((c) => [0, 1].map((r) => ({ c, r, dark: (c + r) % 4 < 2 })))
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" focusable="false">
      <g stroke="currentColor" strokeOpacity={0.75} strokeWidth={1.3}>
        {[9.5, 12.5, 15.5, 18.5, 21.5].map((x) => (
          <line key={x} x1={x} y1={7} x2={x} y2={19} />
        ))}
      </g>
      {twill.map(({ c, r, dark }) => (
        <rect
          key={`${c}-${r}`}
          x={8 + c * 3}
          y={19 + r * 2.5}
          width={3}
          height={2.5}
          fill="currentColor"
          fillOpacity={dark ? 1 : 0.3}
        />
      ))}
      <g fill="#d7b48a">
        <rect x={4} y={4} width={3} height={25} rx={1} />
        <rect x={25} y={4} width={3} height={25} rx={1} />
        <rect x={4} y={4} width={24} height={3} rx={1} />
        <rect x={6} y={11.5} width={20} height={2} rx={0.8} />
        <rect x={4} y={24} width={24} height={2.5} rx={1} />
      </g>
    </svg>
  )
}

/**
 * The Weave Patterner logo for the app bar: the loom, the name, and a woven band underneath that runs like cloth
 * coming off the loom. Uses the current text colour, so it sits on the app bar in either theme.
 */
export function Logo({ compact = false }: { compact?: boolean }) {
  // The band: two rows of small squares in a 2/2 twill, as wide as the name.
  const band = Array.from({ length: 34 }, (_, c) => [0, 1].map((r) => ({ c, r, dark: (c + r) % 4 < 2 }))).flat()
  return (
    <a
      href="./"
      aria-label="Weave Patterner"
      style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'inherit', textDecoration: 'none' }}
    >
      <LoomMark size={compact ? 30 : 36} />
      {!compact && (
        <span style={{ display: 'inline-flex', flexDirection: 'column', lineHeight: 1 }}>
          <span style={{ fontSize: 21, letterSpacing: 0.3, whiteSpace: 'nowrap' }}>
            <span style={{ fontWeight: 800 }}>Weave</span> <span style={{ fontWeight: 400 }}>Patterner</span>
          </span>
          <svg width="100%" height={6} viewBox="0 0 136 6" preserveAspectRatio="none" aria-hidden="true">
            {band.map(({ c, r, dark }) => (
              <rect
                key={`${c}-${r}`}
                x={c * 4}
                y={r * 3}
                width={4}
                height={3}
                fill="currentColor"
                fillOpacity={dark ? 0.9 : 0.25}
              />
            ))}
          </svg>
        </span>
      )}
    </a>
  )
}
