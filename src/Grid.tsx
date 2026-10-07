import { type KeyboardEvent, useEffect, useRef, useState } from 'react'

interface GridProps {
  rows: number
  cols: number
  isOn: (r: number, c: number) => boolean
  /** called when a cell is clicked or dragged over; `value` is the state being painted */
  onPaint: (r: number, c: number, value: boolean) => void
  /** Accessible name of the whole grid, e.g. "Threading". */
  label: string
  /** Accessible name of one cell, e.g. "End 5, shaft 2". */
  cellLabel: (r: number, c: number) => string
  /** Let a finger drag-paint like a mouse. When off, touch swipes scroll and a tap toggles one cell. */
  touchPaint?: boolean
}

const ARROWS: Record<string, [number, number]> = {
  ArrowUp: [-1, 0],
  ArrowDown: [1, 0],
  ArrowLeft: [0, -1],
  ArrowRight: [0, 1],
}

/**
 * A grid of binary cells. Mouse/pen: click toggles, click-and-drag paints the same value across cells.
 * Touch: tap toggles and swipes scroll the page, or drag-paints when `touchPaint` is on.
 * Keyboard: Tab reaches the grid once, arrow keys move, Space/Enter toggles.
 */
export function Grid({ rows, cols, isOn, onPaint, label, cellLabel, touchPaint = false }: GridProps) {
  const paintValue = useRef<boolean | null>(null)
  const lastPointer = useRef('mouse')
  const container = useRef<HTMLDivElement>(null)
  // Roving tab stop: only the focused cell is tabbable.
  const [focus, setFocus] = useState<[number, number]>([0, 0])
  const [fr, fc] = [Math.min(focus[0], rows - 1), Math.min(focus[1], cols - 1)]

  useEffect(() => {
    const stop = () => {
      paintValue.current = null
    }
    window.addEventListener('pointerup', stop)
    return () => window.removeEventListener('pointerup', stop)
  }, [])

  const onKeyDown = (e: KeyboardEvent, r: number, c: number, on: boolean) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault()
      onPaint(r, c, !on)
      return
    }
    const move = ARROWS[e.key]
    if (!move) return
    e.preventDefault()
    const next: [number, number] = [
      Math.max(0, Math.min(rows - 1, r + move[0])),
      Math.max(0, Math.min(cols - 1, c + move[1])),
    ]
    setFocus(next)
    container.current?.querySelector<HTMLElement>(`[data-cell="${next[0]}-${next[1]}"]`)?.focus()
  }

  const cells = []
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const on = isOn(r, c)
      cells.push(
        // biome-ignore lint/a11y/useSemanticElements: a native checkbox toggles itself on click, which fights drag-painting; this is the ARIA checkbox pattern with a roving tab stop
        <div
          key={`${r}-${c}`}
          data-cell={`${r}-${c}`}
          role="checkbox"
          aria-checked={on}
          aria-label={cellLabel(r, c)}
          tabIndex={r === fr && c === fc ? 0 : -1}
          className={`cell${on ? ' on' : ''}`}
          onFocus={() => setFocus([r, c])}
          onKeyDown={(e) => onKeyDown(e, r, c, on)}
          onPointerDown={(e) => {
            lastPointer.current = e.pointerType
            // Without drag-painting, a finger waits for a tap so that a swipe can scroll instead.
            if (e.pointerType === 'touch' && !touchPaint)
              return // Release the implicit capture so pointerenter fires on the other cells being dragged over.
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
    // biome-ignore lint/a11y/useSemanticElements: a <fieldset> can't reliably be a CSS grid container in every browser
    <div
      ref={container}
      role="group"
      aria-label={label}
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
