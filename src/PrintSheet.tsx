import type { ReactNode } from 'react'
import { computeDrawdown, type Draft } from './weave'

/** Cell size in SVG units; the SVG scales to the printed page. */
const C = 10
const GAP = C * 1.2
const TICK = '#c62828'
const LINE = '#9e9e9e'

interface Props {
  name: string
  draft: Draft
}

/**
 * A print-only rendering of the full draft in the classic layout: warp colours and threading above the
 * drawdown, tie-up top right, treadling and weft colours to the right, with a tick and number every 4 threads.
 */
export function PrintSheet({ name, draft }: Props) {
  const { shafts, treadles, ends, picks } = draft
  const drawdown = computeDrawdown(draft)

  const labelBand = C * 1.6 // room for tick numbers
  const x0 = 0
  const xTie = x0 + ends * C + GAP
  const xWeft = xTie + treadles * C + GAP
  const width = xWeft + C + labelBand + C
  const yWarp = labelBand
  const yThread = yWarp + C + GAP / 2
  const yDraw = yThread + shafts * C + GAP
  const height = yDraw + picks * C + 2

  const cells: ReactNode[] = []
  const rect = (key: string, x: number, y: number, fill: string, w = C, h = C) =>
    cells.push(<rect key={key} x={x} y={y} width={w} height={h} fill={fill} />)

  // Grid backgrounds: white cells with thin lines, filled cells drawn on top.
  const grid = (key: string, x: number, y: number, cols: number, rows: number) => (
    <g key={key}>
      <rect x={x} y={y} width={cols * C} height={rows * C} fill="#fff" stroke="#333" strokeWidth={0.8} />
      {Array.from({ length: cols - 1 }, (_, i) => (
        <line
          key={`v${i}`}
          x1={x + (i + 1) * C}
          y1={y}
          x2={x + (i + 1) * C}
          y2={y + rows * C}
          stroke={LINE}
          strokeWidth={0.4}
        />
      ))}
      {Array.from({ length: rows - 1 }, (_, i) => (
        <line
          key={`h${i}`}
          x1={x}
          y1={y + (i + 1) * C}
          x2={x + cols * C}
          y2={y + (i + 1) * C}
          stroke={LINE}
          strokeWidth={0.4}
        />
      ))}
    </g>
  )

  // Shaft 1 at the bottom, matching the editor.
  draft.threading.forEach((s, e) => {
    if (s >= 0) rect(`t${e}`, x0 + e * C, yThread + (shafts - 1 - s) * C, '#111')
  })
  draft.tieup.forEach((row, s) => {
    row.forEach((on, t) => {
      if (on) rect(`u${s}-${t}`, xTie + t * C, yThread + (shafts - 1 - s) * C, '#111')
    })
  })
  draft.treadling.forEach((row, p) => {
    row.forEach((on, t) => {
      if (on) rect(`r${p}-${t}`, xTie + t * C, yDraw + p * C, '#111')
    })
  })
  drawdown.forEach((row, p) => {
    row.forEach((up, e) => {
      rect(`d${p}-${e}`, x0 + e * C, yDraw + p * C, up ? draft.warpColors[e] : draft.weftColors[p])
    })
  })
  draft.warpColors.forEach((c, e) => {
    rect(`w${e}`, x0 + e * C, yWarp, c)
  })
  draft.weftColors.forEach((c, p) => {
    rect(`f${p}`, xWeft, yDraw + p * C, c)
  })

  // Ticks and numbers every 4 threads, like a printed draft.
  const ticks: ReactNode[] = []
  for (let e = 4; e <= ends; e += 4) {
    const x = x0 + e * C
    ticks.push(
      <line key={`te${e}`} x1={x} y1={yWarp - C * 0.9} x2={x} y2={yWarp - 1} stroke={TICK} strokeWidth={0.8} />,
    )
    ticks.push(
      <text key={`ne${e}`} x={x - 2} y={yWarp - C * 0.6} fontSize={C * 0.75} fill={TICK} textAnchor="end">
        {e}
      </text>,
    )
  }
  for (let p = 4; p <= picks; p += 4) {
    const y = yDraw + p * C
    const x = xWeft + C + 2
    ticks.push(<line key={`tp${p}`} x1={x} y1={y} x2={x + labelBand} y2={y} stroke={TICK} strokeWidth={0.8} />)
    ticks.push(
      <text key={`np${p}`} x={x + 1} y={y - 2} fontSize={C * 0.75} fill={TICK}>
        {p}
      </text>,
    )
  }

  // Thin lines over the drawdown so individual threads can be counted.
  const drawLines: ReactNode[] = []
  for (let e = 1; e < ends; e++)
    drawLines.push(
      <line
        key={`dv${e}`}
        x1={x0 + e * C}
        y1={yDraw}
        x2={x0 + e * C}
        y2={yDraw + picks * C}
        stroke="#000"
        strokeOpacity={0.35}
        strokeWidth={0.3}
      />,
    )
  for (let p = 1; p < picks; p++)
    drawLines.push(
      <line
        key={`dh${p}`}
        x1={x0}
        y1={yDraw + p * C}
        x2={x0 + ends * C}
        y2={yDraw + p * C}
        stroke="#000"
        strokeOpacity={0.35}
        strokeWidth={0.3}
      />,
    )

  // Strip frames.
  const frames = [
    <rect key="fw" x={x0} y={yWarp} width={ends * C} height={C} fill="none" stroke="#333" strokeWidth={0.8} />,
    <rect key="ff" x={xWeft} y={yDraw} width={C} height={picks * C} fill="none" stroke="#333" strokeWidth={0.8} />,
    <rect key="fd" x={x0} y={yDraw} width={ends * C} height={picks * C} fill="none" stroke="#111" strokeWidth={1.4} />,
  ]

  const palette = [...new Set([...draft.warpColors, ...draft.weftColors])]

  return (
    <div className="print-sheet">
      <header className="print-header">
        <h1>{name}</h1>
        <p>
          {shafts} shafts · {treadles} treadles · {ends} ends × {picks} picks · rising shed
        </p>
        <div className="print-palette">
          {palette.map((c) => (
            <span key={c}>
              <i style={{ background: c }} />
              {c}
            </span>
          ))}
        </div>
      </header>
      <svg
        viewBox={`-2 -2 ${width + 4} ${height + 4}`}
        className="print-draft"
        role="img"
        aria-label={`Draft of ${name}`}
      >
        {grid('gt', x0, yThread, ends, shafts)}
        {grid('gu', xTie, yThread, treadles, shafts)}
        {grid('gr', xTie, yDraw, treadles, picks)}
        {cells}
        {drawLines}
        {frames}
        {ticks}
      </svg>
      <footer className="print-footer">
        Weave Patterner · steves165.github.io/weave-patterner · printed {new Date().toLocaleDateString()}
      </footer>
    </div>
  )
}
