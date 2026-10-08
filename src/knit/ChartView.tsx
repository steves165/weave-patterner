import { type KeyboardEvent, memo, type PointerEvent, useRef, useState } from 'react'
import { textOn } from '../colors'
import { cablesIn, colorLetter, isRightSide, type KnitChart, rowsOf, widthOf } from './chart'
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
}

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
              className={`knit-cell${(p.width - c) % 10 === 1 && c > 0 ? ' knit-ten' : ''}`}
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
export function ChartView({ chart, cell, cellH, flagged, onPaint }: Props) {
  const rows = rowsOf(chart)
  const w = widthOf(chart)
  const dragging = useRef(false)
  const last = useRef('')
  const [cursor, setCursor] = useState<{ r: number; c: number } | null>(null)

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
    onPaint(hit.r, hit.c, false)
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
      setCursor({ r: Math.max(0, Math.min(rows - 1, cur.r + dr)), c: Math.max(0, Math.min(w - 1, cur.c + dc)) })
    } else if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault()
      setCursor(cur)
      onPaint(cur.r, cur.c, true)
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
      className="knit-chart"
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
