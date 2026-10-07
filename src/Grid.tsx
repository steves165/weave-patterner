import { useEffect, useRef } from 'react'

interface GridProps {
  rows: number
  cols: number
  isOn: (r: number, c: number) => boolean
  /** called when a cell is clicked or dragged over; `value` is the state being painted */
  onPaint: (r: number, c: number, value: boolean) => void
  className?: string
}

/** A grid of binary cells. Click toggles; click-and-drag paints the same value across cells. */
export function Grid({ rows, cols, isOn, onPaint, className }: GridProps) {
  const paintValue = useRef<boolean | null>(null)

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
            ;(e.target as Element).releasePointerCapture(e.pointerId)
            paintValue.current = !on
            onPaint(r, c, !on)
          }}
          onPointerEnter={() => {
            if (paintValue.current !== null) onPaint(r, c, paintValue.current)
          }}
        />,
      )
    }
  }

  return (
    <div className={`grid ${className ?? ''}`} style={{ gridTemplateColumns: `repeat(${cols}, var(--cell))` }}>
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
