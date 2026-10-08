import { type KeyboardEvent, memo, type PointerEvent, useEffect, useRef, useState } from 'react'
import { textOn } from '../colors'
import { cablesIn, colorLetter, isRightSide, type KnitChart, rowsOf, widthOf } from './chart'
import { type Rect, rectBetween } from './edit'
import { cablePaths, NO_STITCH, shade } from './render'
import { STITCHES, type StitchId } from './stitches'

interface Props {
  chart: KnitChart
  /** Square width and height in px. */
  cell: number
  cellH: number
  /** Rows (1-based) to flag, with why. */
  flagged: Map<number, string>
  /** Paints a square; `start` is true for the first square of a stroke (so a whole drag undoes in one go). */
  onPaint: (r: number, c: number, start: boolean) => void
  /** Selecting rather than painting: a drag (or Shift and the arrow keys) marks out a rectangle of squares. */
  selecting?: boolean
  selection?: Rect | null
  onSelect?: (s: Rect | null) => void
}

interface RowProps {
  r: number
  stitches: StitchId[]
  colors: number[]
  palette: string[]
  width: number
  cell: number
  cellH: number
  rs: boolean
  round: boolean
  flag: string | undefined
  cursor: number | null
  /** Squares (columns) just painted, to pop. */
  painted: readonly number[]
  /** Selected squares in this row: columns from and to. */
  sel: readonly [number, number] | null
  /** The repeat box's columns, and whether this row is its top or bottom edge. */
  box: { from: number; to: number; top: boolean; bottom: boolean } | null
}

const NONE: readonly number[] = []

const ChartRow = memo(function ChartRow(p: RowProps) {
  const num = (
    <span className={`knit-num${p.flag ? ' knit-flag' : ''}`} title={p.flag} style={{ height: p.cellH }}>
      {p.r + 1}
    </span>
  )
  return (
    // biome-ignore lint/a11y/useSemanticElements: rows of a flex layout with cable overlays; a <table> can't hold those
    // biome-ignore lint/a11y/useFocusableInteractive: the grid holds focus and points at the current square
    <div role="row" className="knit-row" aria-label={`${p.round ? 'Round' : 'Row'} ${p.r + 1}`}>
      <span className="knit-side">{!p.rs && num}</span>
      <div className="knit-cells" style={{ height: p.cellH }}>
        {p.stitches.map((s, c) => {
          const stitch = STITCHES[s]
          const bg = s === 'none' ? NO_STITCH : p.palette[p.colors[c]]
          return (
            // biome-ignore lint/a11y/useSemanticElements: see the row
            // biome-ignore lint/a11y/useFocusableInteractive: the grid holds focus (aria-activedescendant)
            <div
              // biome-ignore lint/suspicious/noArrayIndexKey: squares are positions in the row
              key={c}
              id={`knit-${p.r}-${c}`}
              role="gridcell"
              data-r={p.r}
              data-c={c}
              data-stitch={s}
              aria-label={`${p.round ? 'Round' : 'Row'} ${p.r + 1}, stitch ${p.width - c}: ${stitch.name}${s === 'none' ? '' : `, colour ${colorLetter(p.colors[c])}`}`}
              aria-selected={p.cursor === c}
              className={`knit-cell${(p.width - c) % 10 === 1 && c > 0 ? ' knit-ten' : ''}${p.painted.includes(c) ? ' painted' : ''}${p.sel && c >= p.sel[0] && c <= p.sel[1] ? ' selected' : ''}`}
              style={{
                width: p.cell,
                height: p.cellH,
                background: bg,
                color: textOn(bg),
                fontSize: stitch.symbol.length > 1 ? p.cell * 0.42 : Math.min(p.cell, p.cellH) * 0.72,
              }}
            >
              {stitch.symbol}
            </div>
          )
        })}
        {cablesIn(p.stitches).map((cable) => {
          const w = cable.width * p.cell
          const { back, front } = cablePaths(cable.id, w, p.cellH)
          const bg = p.palette[p.colors[cable.start]]
          return (
            <svg
              key={cable.start}
              className="knit-cable"
              width={w}
              height={p.cellH}
              style={{ left: cable.start * p.cell }}
              aria-hidden="true"
            >
              <path d={back} fill={shade(bg, -0.25)} stroke={textOn(bg)} strokeWidth={1} />
              <path d={front} fill={shade(bg, 0.25)} stroke={textOn(bg)} strokeWidth={1} />
            </svg>
          )
        })}
        {p.box && (
          <div
            className={`knit-repeat${p.box.top ? ' top' : ''}${p.box.bottom ? ' bottom' : ''}`}
            style={{ left: p.box.from * p.cell, width: (p.box.to - p.box.from + 1) * p.cell }}
            aria-hidden="true"
          />
        )}
      </div>
      <span className="knit-side">{p.rs && num}</span>
    </div>
  )
})

/**
 * The chart, row 1 at the bottom. Row numbers sit on the side each row starts from: right-side rows on the right,
 * wrong-side rows on the left (every round on the right). Stitches are numbered from the right. Click or drag to
 * paint (tap on touch screens, where swiping scrolls); arrow keys move and Space paints.
 */
export function ChartView({
  chart,
  cell,
  cellH,
  flagged,
  onPaint,
  selecting = false,
  selection = null,
  onSelect,
}: Props) {
  const rows = rowsOf(chart)
  const w = widthOf(chart)
  const dragging = useRef(false)
  const last = useRef('')
  const [cursor, setCursor] = useState<{ r: number; c: number } | null>(null)
  // Where a selection started (the corner that stays put as it's dragged or extended).
  const anchor = useRef<{ r: number; c: number } | null>(null)

  // Squares the last change painted (a new stitch or colour), by row, so they pop. Big changes (a new chart, a
  // sample, clearing) don't: everything would.
  const before = useRef<KnitChart | null>(null)
  const [painted, setPainted] = useState<Map<number, number[]>>(() => new Map())
  useEffect(() => {
    const last = before.current
    before.current = chart
    const diff = new Map<number, number[]>()
    let count = 0
    if (last && rowsOf(last) === rows && widthOf(last) === w)
      for (let r = 0; r < rows; r++)
        for (let c = 0; c < w; c++)
          if (last.stitch[r][c] !== chart.stitch[r][c] || last.color[r][c] !== chart.color[r][c]) {
            diff.set(r, [...(diff.get(r) ?? []), c])
            count++
          }
    if (count === 0 || count > (rows * w) / 3) {
      setPainted((m) => (m.size ? new Map() : m))
      return
    }
    setPainted(diff)
    const done = setTimeout(() => setPainted(new Map()), 400)
    return () => clearTimeout(done)
  }, [chart, rows, w])

  const at = (x: number, y: number) => {
    const el = document.elementFromPoint(x, y)?.closest<HTMLElement>('[data-c]')
    return el ? { r: Number(el.dataset.r), c: Number(el.dataset.c) } : null
  }
  // On touch screens a swipe scrolls, so a square is painted when the finger lifts without having moved off it.
  const tapped = useRef<{ r: number; c: number } | null>(null)
  const down = (e: PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return
    const hit = at(e.clientX, e.clientY)
    if (!hit) return
    if (selecting) {
      e.preventDefault()
      e.currentTarget.setPointerCapture(e.pointerId)
      dragging.current = true
      anchor.current = hit
      last.current = `${hit.r}-${hit.c}`
      setCursor(hit)
      onSelect?.(rectBetween(hit, hit))
      return
    }
    if (e.pointerType === 'touch') {
      tapped.current = hit
      return
    }
    e.preventDefault()
    e.currentTarget.setPointerCapture(e.pointerId)
    dragging.current = true
    last.current = `${hit.r}-${hit.c}`
    setCursor(hit)
    onPaint(hit.r, hit.c, true)
  }
  const move = (e: PointerEvent<HTMLDivElement>) => {
    if (!dragging.current) return
    const hit = at(e.clientX, e.clientY)
    if (!hit || `${hit.r}-${hit.c}` === last.current) return
    last.current = `${hit.r}-${hit.c}`
    if (selecting && anchor.current) {
      setCursor(hit)
      onSelect?.(rectBetween(anchor.current, hit))
    } else onPaint(hit.r, hit.c, false)
  }
  const up = (e: PointerEvent<HTMLDivElement>) => {
    dragging.current = false
    const tap = tapped.current
    tapped.current = null
    if (!tap || e.type !== 'pointerup') return
    const hit = at(e.clientX, e.clientY)
    if (hit?.r === tap.r && hit.c === tap.c) {
      setCursor(hit)
      onPaint(hit.r, hit.c, true)
    }
  }
  const key = (e: KeyboardEvent<HTMLDivElement>) => {
    const cur = cursor ?? { r: 0, c: w - 1 }
    const step: Record<string, [number, number]> = {
      ArrowUp: [1, 0],
      ArrowDown: [-1, 0],
      ArrowLeft: [0, -1],
      ArrowRight: [0, 1],
    }
    if (e.key in step) {
      e.preventDefault()
      const [dr, dc] = step[e.key]
      const next = { r: Math.max(0, Math.min(rows - 1, cur.r + dr)), c: Math.max(0, Math.min(w - 1, cur.c + dc)) }
      setCursor(next)
      // Shift and an arrow key selects, from where the cursor was.
      if (e.shiftKey && onSelect) {
        anchor.current ??= cur
        onSelect(rectBetween(anchor.current, next))
      } else anchor.current = null
    } else if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault()
      setCursor(cur)
      if (selecting) {
        anchor.current = cur
        onSelect?.(rectBetween(cur, cur))
      } else onPaint(cur.r, cur.c, true)
    }
  }

  return (
    // biome-ignore lint/a11y/useSemanticElements: a flex layout, with cables drawn across squares; see the rows
    <div
      role="grid"
      aria-label="Knitting chart"
      aria-rowcount={rows}
      aria-colcount={w}
      tabIndex={0}
      aria-activedescendant={cursor ? `knit-${cursor.r}-${cursor.c}` : undefined}
      className={`knit-chart${selecting ? ' selecting' : ''}`}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={up}
      onKeyDown={key}
      onFocus={() => setCursor((c) => c ?? { r: 0, c: w - 1 })}
    >
      {Array.from({ length: rows }, (_, i) => rows - 1 - i).map((r) => (
        <ChartRow
          key={r}
          r={r}
          stitches={chart.stitch[r]}
          colors={chart.color[r]}
          palette={chart.colors}
          width={w}
          cell={cell}
          cellH={cellH}
          rs={isRightSide(chart, r)}
          round={chart.mode === 'round'}
          flag={flagged.get(r + 1)}
          cursor={cursor?.r === r ? cursor.c : null}
          painted={painted.get(r) ?? NONE}
          sel={selection && r >= selection.r0 && r <= selection.r1 ? [selection.c0, selection.c1] : null}
          box={chart.repeat ? { ...chart.repeat, top: r === rows - 1, bottom: r === 0 } : null}
        />
      ))}
      <div className="knit-row" aria-hidden="true">
        <span className="knit-side" />
        <div className="knit-cells knit-stitch-numbers">
          {Array.from({ length: w }, (_, c) => w - c).map((n) => (
            <span key={n} style={{ width: cell }}>
              {n === 1 || n % 5 === 0 ? n : ''}
            </span>
          ))}
        </div>
        <span className="knit-side" />
      </div>
    </div>
  )
}
