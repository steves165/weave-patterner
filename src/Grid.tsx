import { useEffect, useRef } from 'react'

interface GridProps {
  rows: number
  cols: number
  isOn: (r: number, c: number) => boolean
  /** called when a cell is clicked or dragged over; `value` is the state being painted */
  onPaint: (r: number, c: number, value: boolean) => void
  /** Let a finger drag-paint like a mouse. When off, touch swipes scroll and a tap toggles one cell. */
  touchPaint?: boolean
}

/**
 * A grid of binary cells. Mouse/pen: click toggles, click-and-drag paints the same value across cells.
 * Touch: tap toggles and swipes scroll the page, or drag-paints when `touchPaint` is on.
 */
export function Grid({ rows, cols, isOn, onPaint, touchPaint = false }: GridProps) {
  const paintValue = useRef<boolean | null>(null)
  const lastPointer = useRef('mouse')

  useEffect(() => {
    const stop = () => (paintValue.current = null)
    window.addEventListener('pointerup', stop)
    return () => window.removeEventListener('pointerup', stop)
  }, [])

  const cells = []
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const on = isOn(r, c)
      cells.push(
        <div
          key={`${r}-${c}`}
          className={`cell${on ? ' on' : ''}`}
          onPointerDown={(e) => {
            lastPointer.current = e.pointerType
            if (e.pointerType === 'touch' && !touchPaint)
              return // wait for a tap; a swipe scrolls
              // Release the implicit capture so pointerenter fires on the other cells being dragged over.
            ;(e.target as Element).releasePointerCapture(e.pointerId)
            paintValue.current = !on
            onPaint(r, c, !on)
          }}
          onPointerEnter={() => {
            if (paintValue.current !== null) onPaint(r, c, paintValue.current)
          }}
          onClick={() => {
            // Browsers only send a click for a tap that didn't turn into a scroll.
            if (lastPointer.current === 'touch' && !touchPaint) onPaint(r, c, !on)
          }}
        />,
      )
    }
  }

  return (
    <div
      className={`grid paintable${touchPaint ? ' touch-paint' : ''}`}
      style={{ gridTemplateColumns: `repeat(${cols}, var(--cell))` }}
    >
      {cells}
    </div>
  )
}

interface ColorStripProps {
  colors: string[]
  vertical?: boolean
  onChange: (i: number, color: string) => void
}

/** A strip of colour swatches, each opening a colour picker when clicked. */
export function ColorStrip({ colors, vertical, onChange }: ColorStripProps) {
  return (
    <div
      className="grid strip"
      style={
        vertical
          ? { gridTemplateColumns: 'var(--cell)' }
          : { gridTemplateColumns: `repeat(${colors.length}, var(--cell))` }
      }
    >
      {colors.map((color, i) => (
        <input
          key={i}
          type="color"
          className="swatch"
          value={color}
          title={`${vertical ? 'Weft' : 'Warp'} ${i + 1}: ${color}`}
          onChange={(e) => onChange(i, e.target.value)}
        />
      ))}
    </div>
  )
}
