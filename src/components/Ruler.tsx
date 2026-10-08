const TICK = '#c62828'

interface Props {
  /** Number of threads along the ruler. */
  count: number
  /** Tick every this many threads. */
  every: number
  cellSize: number
  orientation: 'horizontal' | 'vertical'
  /** Horizontal only: thread 1 is at the right-hand end. */
  reversed?: boolean
  label: string
}

/**
 * Red tick marks and numbers every few threads, lined up with the grid cells (cell + 1px line pitch), like a
 * printed draft.
 */
export function Ruler({ count, every, cellSize, orientation, reversed = false, label }: Props) {
  const pitch = cellSize + 1
  const length = count * pitch + 1
  const marks = []
  for (let n = every; n <= count; n += every) {
    // Index of thread n as drawn, then the grid line on its far side (towards higher numbers).
    const k = reversed ? count - n : n - 1
    const at = reversed ? k * pitch : (k + 1) * pitch
    marks.push(
      orientation === 'horizontal' ? (
        <span key={n} className="ruler-mark" style={{ left: at, height: '100%' }}>
          <span className={`ruler-label ${reversed ? 'after' : 'before'}`}>{n}</span>
        </span>
      ) : (
        <span key={n} className="ruler-mark" style={{ top: at, width: '100%', height: 1 }}>
          <span className="ruler-label above">{n}</span>
        </span>
      ),
    )
  }
  return (
    <div
      className={`ruler ruler-${orientation}`}
      role="presentation"
      aria-label={label}
      style={{
        ['--tick' as string]: TICK,
        ...(orientation === 'horizontal' ? { width: length, height: 14 } : { height: length, width: 22 }),
      }}
    >
      {marks}
    </div>
  )
}
