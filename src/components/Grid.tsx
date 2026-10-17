import { type KeyboardEvent, useEffect, useRef, useState } from 'react'
import { textOn } from '../colors'
import { ColourInput } from './ColourInput'

interface GridProps {
  rows: number
  cols: number
  isOn: (r: number, c: number) => boolean
  /**
   * Called when a cell is clicked or dragged over; `value` is the state being painted. `continuing` is true for
   * cells after the first in one drag stroke, so the whole stroke can be undone as one step.
   */
  onPaint: (r: number, c: number, value: boolean, continuing: boolean) => void
  /** Accessible name of the whole grid, e.g. "Threading". */
  label: string
  /** Accessible name of one cell, e.g. "End 5, shaft 2". */
  cellLabel: (r: number, c: number) => string
  /** Let a finger drag-paint like a mouse. When off, touch swipes scroll and a tap toggles one cell. */
  touchPaint?: boolean
  /** Text shown in filled cells (e.g. the shaft number), when numbers are switched on. */
  cellText?: (r: number, c: number) => string
  /** Colour of a filled cell (e.g. the thread it stands for); filled cells are plain black/white without it. */
  cellColor?: (r: number, c: number) => string
  /** Cells to outline because they decide the drawdown square being traced. */
  traced?: (r: number, c: number) => boolean
  /** Columns count from the right (end 1 on the right), so the heavier lines every 4 do too. */
  fromRight?: boolean
  /** Rows count from the bottom (pick 1 at the bottom), so the heavier lines every 4 do too. */
  fromBottom?: boolean
  /**
   * A drag paints one box in each column (threading: one shaft per end) or each row (treadling: one per pick), on a
   * line from box to box, so a diagonal drag makes a neat diagonal. Without it, every box the pointer crosses is
   * painted.
   */
  oneEach?: 'row' | 'column'
  /** The help topic F1 opens here. */
  help?: string
  /** The cell under the mouse, or null when it leaves the grid (for keys that act on the thread under the mouse). */
  onHover?: (cell: [number, number] | null) => void
  /** Cells inside the selection, shaded. */
  selected?: (r: number, c: number) => boolean
  /** Select mode: pressing a cell starts a selection there and dragging extends it (`extend`), instead of painting. */
  onSelect?: (r: number, c: number, extend: boolean) => void
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
export function Grid({
  rows,
  cols,
  isOn,
  onPaint,
  label,
  cellLabel,
  touchPaint = false,
  cellText,
  cellColor,
  traced,
  fromRight = false,
  fromBottom = false,
  oneEach,
  help,
  onHover,
  selected,
  onSelect,
}: GridProps) {
  const paintValue = useRef<boolean | null>(null)
  // With oneEach: the box painted in each row or column during this drag, what each box was before, and where the
  // pointer was last, in boxes (fractional: line, position along it).
  const stroke = useRef<{ painted: Map<number, number>; was: Map<string, boolean>; at: [number, number] } | null>(null)
  const selecting = useRef(false)
  const lastPointer = useRef('mouse')
  const container = useRef<HTMLDivElement>(null)
  // Roving tab stop: only the focused cell is tabbable.
  const [focus, setFocus] = useState<[number, number]>([0, 0])
  const [fr, fc] = [Math.min(focus[0], rows - 1), Math.min(focus[1], cols - 1)]

  useEffect(() => {
    const stop = () => {
      paintValue.current = null
      stroke.current = null
      selecting.current = false
    }
    window.addEventListener('pointerup', stop)
    return () => window.removeEventListener('pointerup', stop)
  }, [])

  const onKeyDown = (e: KeyboardEvent, r: number, c: number, on: boolean) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault()
      onPaint(r, c, !on, false)
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

  /** oneEach: where the pointer is, in boxes: [line, position along it], both fractional. */
  const pointerAt = (x: number, y: number): [number, number] | null => {
    const first = container.current?.querySelector('[data-cell="0-0"]')?.getBoundingClientRect()
    if (!first) return null
    const pitch = first.width + 1 // a 1px line between boxes
    const [across, down] = [(x - first.left) / pitch, (y - first.top) / pitch]
    return oneEach === 'row' ? [down, across] : [across, down]
  }
  /** oneEach: a box on a line, as [row, column]. */
  const boxOf = (line: number, at: number): [number, number] => (oneEach === 'row' ? [line, at] : [at, line])
  const lines = oneEach === 'row' ? rows : cols
  const along = oneEach === 'row' ? cols : rows
  /** oneEach: paints `at` as the one box on `line` this drag, moving the box painted there before. */
  const place = (line: number, at: number, value: boolean) => {
    const s = stroke.current
    if (!s || line < 0 || line >= lines) return
    at = Math.max(0, Math.min(along - 1, at))
    const before = s.painted.get(line)
    if (before === at) return
    if (before !== undefined) {
      const [br, bc] = boxOf(line, before)
      onPaint(br, bc, s.was.get(`${br}-${bc}`) ?? !value, true)
    }
    const [r, c] = boxOf(line, at)
    if (!s.was.has(`${r}-${c}`)) s.was.set(`${r}-${c}`, isOn(r, c))
    s.painted.set(line, at)
    onPaint(r, c, value, true)
  }
  /**
   * oneEach: the pointer moved. Each line whose middle it crossed gets the box the pointer was over at that moment,
   * so a diagonal through the corners of boxes paints the diagonal, not the boxes beside it.
   */
  const strokeTo = (x: number, y: number) => {
    const s = stroke.current
    const now = pointerAt(x, y)
    if (!s || !now || paintValue.current === null) return
    const value = paintValue.current
    const [l0, a0] = s.at
    const [l1, a1] = now
    const lo = Math.ceil(Math.min(l0, l1) - 0.5)
    const hi = Math.floor(Math.max(l0, l1) - 0.5)
    const lineIndexes = []
    for (let line = lo; line <= hi; line++) lineIndexes.push(line)
    if (l1 < l0) lineIndexes.reverse()
    for (const line of lineIndexes) {
      const mid = line + 0.5
      const t = l1 === l0 ? 1 : (mid - l0) / (l1 - l0)
      place(line, Math.floor(a0 + (a1 - a0) * t), value)
    }
    // The line the pointer is on gets a box as soon as it's reached, even before its middle (crossing the middle
    // puts the box right); near its middle, moving along the line moves its box.
    const line = Math.floor(l1)
    if (!s.painted.has(line) || Math.abs(l1 - (line + 0.5)) < 0.25) place(line, Math.floor(a1), value)
    s.at = now
  }

  const cells = []
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const on = isOn(r, c)
      const color = on && cellColor ? cellColor(r, c) : undefined
      cells.push(
        // biome-ignore lint/a11y/useSemanticElements: a native checkbox toggles itself on click, which fights drag-painting; this is the ARIA checkbox pattern with a roving tab stop
        <div
          key={`${r}-${c}`}
          data-cell={`${r}-${c}`}
          role="checkbox"
          aria-checked={on}
          aria-label={cellLabel(r, c)}
          tabIndex={r === fr && c === fc ? 0 : -1}
          className={`cell${on ? ' on' : ''}${color ? ' colored' : ''}${traced?.(r, c) ? ' traced' : ''}${selected?.(r, c) ? ' selected' : ''}`}
          style={color ? { backgroundColor: color, color: textOn(color) } : undefined}
          onFocus={() => setFocus([r, c])}
          onKeyDown={(e) => onKeyDown(e, r, c, on)}
          onPointerDown={(e) => {
            lastPointer.current = e.pointerType
            if (onSelect) {
              if (e.button !== 0) return
              ;(e.target as Element).releasePointerCapture(e.pointerId)
              selecting.current = true
              onSelect(r, c, e.shiftKey)
              return
            }
            // Without drag-painting, a finger waits for a tap so that a swipe can scroll instead.
            if (e.pointerType === 'touch' && !touchPaint)
              return // Release the implicit capture so pointerenter fires on the other cells being dragged over.
            ;(e.target as Element).releasePointerCapture(e.pointerId)
            paintValue.current = !on
            if (oneEach) {
              const [line, at] = oneEach === 'row' ? [r, c] : [c, r]
              const where = pointerAt(e.clientX, e.clientY)
              stroke.current = {
                painted: new Map([[line, at]]),
                was: new Map([[`${r}-${c}`, on]]),
                at: where ?? [line + 0.5, at + 0.5],
              }
            }
            onPaint(r, c, !on, false)
          }}
          onPointerEnter={() => {
            onHover?.([r, c])
            if (selecting.current && onSelect) onSelect(r, c, true)
            else if (paintValue.current !== null) {
              if (!stroke.current) onPaint(r, c, paintValue.current, true)
            }
          }}
          onClick={() => {
            if (onSelect) return
            // Browsers only send a click for a tap that didn't turn into a scroll.
            if (lastPointer.current === 'touch' && !touchPaint) onPaint(r, c, !on, false)
          }}
        >
          {on && cellText ? cellText(r, c) : null}
        </div>,
      )
    }
  }

  return (
    // biome-ignore lint/a11y/useSemanticElements: a <fieldset> can't reliably be a CSS grid container in every browser
    <div
      ref={container}
      role="group"
      aria-label={label}
      data-help={help}
      className={`grid paintable${touchPaint ? ' touch-paint' : ''}${fromRight ? ' from-right' : ''}${fromBottom ? ' from-bottom' : ''}`}
      style={{ gridTemplateColumns: `repeat(${cols}, var(--cell))` }}
      onPointerLeave={() => onHover?.(null)}
      onPointerMove={oneEach ? (e) => strokeTo(e.clientX, e.clientY) : undefined}
    >
      {cells}
    </div>
  )
}

interface ColorStripProps {
  colors: string[]
  vertical?: boolean
  onChange: (i: number, color: string) => void
  /** Name of swatch i, e.g. "Warp 3". */
  labelAt: (i: number) => string
  /** Swatch to outline, for the drawdown square being traced. */
  traced?: number
}

/** A strip of colour swatches, each opening a colour picker when clicked. */
export function ColorStrip({ colors, vertical, onChange, labelAt, traced }: ColorStripProps) {
  return (
    <div
      data-help="colours"
      className="grid strip"
      style={
        vertical
          ? { gridTemplateColumns: 'var(--cell)' }
          : { gridTemplateColumns: `repeat(${colors.length}, var(--cell))` }
      }
    >
      {colors.map((color, i) => (
        <ColourInput
          key={i}
          label={labelAt(i)}
          value={color}
          onChange={(v) => onChange(i, v)}
          className={`swatch${i === traced ? ' traced' : ''}`}
          inputProps={{ title: `${labelAt(i)}: ${color}` }}
        />
      ))}
    </div>
  )
}
