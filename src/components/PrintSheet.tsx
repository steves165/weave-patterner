import { type ReactNode, useLayoutEffect, useMemo, useRef } from 'react'
import { liftplanLines, threadingLines, tieupLines, treadlingLines } from '../instructions'
import { isDirectTieup } from '../liftplan'
import { qrPath } from '../qr'
import { clothPainter } from '../shareImage'
import { computeDrawdown, type Draft } from '../weave'
import { WeaveMark } from './Logo'

/** Cell size in SVG units; the SVG scales to the printed page. */
const C = 10
const GAP = C * 1.2
const TICK = '#c62828'
const LINE = '#9e9e9e'

interface Props {
  name: string
  draft: Draft
  /** Draw ends right to left, end 1 on the right (matches the editor's view option). */
  endOneRight?: boolean
  /** Draw picks bottom to top, pick 1 at the bottom (matches the editor's view option). */
  pickOneBottom?: boolean
  /** How the editor shows the drawdown: plain, or the face or back of layered cloth. The cloth picture matches it. */
  clothSide?: 'drawdown' | 'face' | 'back'
  /** Show a picture of the woven cloth at the top of the page. */
  cloth?: boolean
  /** Add a page of written threading, tie-up and treadling instructions. */
  instructions?: boolean
  /** Leave the tie-up out of a lift plan, for looms without one. */
  noTieup?: boolean
  /** A link that opens this pattern in the app, printed as a QR code to scan with a phone's camera. */
  qr?: string | null
}

/**
 * The printed page, in the style of the pictures made for Instagram: the app's mark and the pattern's name, the woven
 * cloth in a big rounded picture (if wanted), a QR code that opens the pattern (if wanted), its colours, and the full draft in the
 * classic layout: warp colours and threading above the drawdown, tie-up top right, treadling and weft colours to the
 * right, with a tick and number every 4 threads.
 */
export function PrintSheet({
  name,
  draft,
  endOneRight = false,
  pickOneBottom = false,
  clothSide = 'drawdown',
  cloth: showCloth = true,
  instructions = false,
  noTieup = false,
  qr = null,
}: Props) {
  // The woven cloth, as the Instagram picture shows it (clothPainter) and the same way up as the draft below it, drawn
  // straight onto a canvas as the sheet appears: the browser's print takes its picture of the page at once, before an
  // image made then would have loaded.
  const cloth = useRef<HTMLCanvasElement>(null)
  useLayoutEffect(() => {
    const ctx = cloth.current?.getContext('2d')
    if (ctx)
      clothPainter(draft, { side: clothSide, endOneRight, pickOneBottom })(
        ctx,
        0,
        0,
        ctx.canvas.width,
        ctx.canvas.height,
      )
  }, [draft, clothSide, endOneRight, pickOneBottom])
  const code = useMemo(() => (qr ? qrPath(qr) : null), [qr])
  const { shafts, treadles, ends, picks } = draft
  const hideTieup = noTieup && isDirectTieup(draft)
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
  // x of end e's column (0-based), honouring end-1-on-the-right.
  const xOf = (e: number) => x0 + (endOneRight ? ends - 1 - e : e) * C
  // y of pick p's row (0-based), honouring pick-1-at-the-bottom.
  const yOf = (p: number) => yDraw + (pickOneBottom ? picks - 1 - p : p) * C

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
    if (s >= 0) rect(`t${e}`, xOf(e), yThread + (shafts - 1 - s) * C, '#111')
  })
  if (!hideTieup)
    draft.tieup.forEach((row, s) => {
      row.forEach((on, t) => {
        if (on) rect(`u${s}-${t}`, xTie + t * C, yThread + (shafts - 1 - s) * C, '#111')
      })
    })
  draft.treadling.forEach((row, p) => {
    row.forEach((on, t) => {
      if (on) rect(`r${p}-${t}`, xTie + t * C, yOf(p), '#111')
    })
  })
  drawdown.forEach((row, p) => {
    row.forEach((up, e) => {
      rect(`d${p}-${e}`, xOf(e), yOf(p), up ? draft.warpColors[e] : draft.weftColors[p])
    })
  })
  draft.warpColors.forEach((c, e) => {
    rect(`w${e}`, xOf(e), yWarp, c)
  })
  draft.weftColors.forEach((c, p) => {
    rect(`f${p}`, xWeft, yOf(p), c)
  })

  // Ticks and numbers every 4 threads, like a printed draft.
  const ticks: ReactNode[] = []
  for (let e = 4; e <= ends; e += 4) {
    // The tick sits on the far side of end e (towards higher numbers), with the number beside it.
    const x = endOneRight ? xOf(e - 1) : xOf(e - 1) + C
    ticks.push(
      <line key={`te${e}`} x1={x} y1={yWarp - C * 0.9} x2={x} y2={yWarp - 1} stroke={TICK} strokeWidth={0.8} />,
    )
    ticks.push(
      <text
        key={`ne${e}`}
        x={endOneRight ? x + 2 : x - 2}
        y={yWarp - C * 0.6}
        fontSize={C * 0.75}
        fill={TICK}
        textAnchor={endOneRight ? 'start' : 'end'}
      >
        {e}
      </text>,
    )
  }
  for (let p = 4; p <= picks; p += 4) {
    // The tick sits on the far side of pick p (towards higher numbers), with the number beside it.
    const y = pickOneBottom ? yOf(p - 1) : yOf(p - 1) + C
    const x = xWeft + C + 2
    ticks.push(<line key={`tp${p}`} x1={x} y1={y} x2={x + labelBand} y2={y} stroke={TICK} strokeWidth={0.8} />)
    ticks.push(
      <text key={`np${p}`} x={x + 1} y={pickOneBottom ? y + C * 0.8 : y - 2} fontSize={C * 0.75} fill={TICK}>
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
        <WeaveMark size={46} />
        <div>
          <h1>{name}</h1>
          <p className="print-made">Made with Weave Patterner · weave-patterner.com</p>
          <p className="print-specs">
            {hideTieup ? `${shafts} shafts · lift plan` : `${shafts} shafts · ${treadles} treadles`} · {ends} ends ×{' '}
            {picks} picks · rising shed
          </p>
        </div>
      </header>
      {(showCloth || code) && (
        <div className="print-hero">
          {showCloth && (
            <canvas
              ref={cloth}
              className="print-cloth"
              width={1600}
              height={760}
              role="img"
              aria-label={`The woven cloth of ${name}`}
            />
          )}
          {code && (
            <figure className="print-qr">
              <svg
                viewBox={`-2 -2 ${code.size + 4} ${code.size + 4}`}
                role="img"
                aria-label={`QR code that opens ${name} in Weave Patterner`}
              >
                <rect x={-2} y={-2} width={code.size + 4} height={code.size + 4} fill="#fff" />
                <path d={code.d} fill="#000" />
              </svg>
              <figcaption>Scan with your phone’s camera to open this pattern in Weave Patterner</figcaption>
            </figure>
          )}
        </div>
      )}
      <div className="print-palette">
        {palette.map((c) => (
          <span key={c}>
            <i style={{ background: c }} />
            {c}
          </span>
        ))}
      </div>
      <div className="print-draft-card">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox={`-2 -2 ${width + 4} ${height + 4}`}
          data-width={width + 4}
          data-height={height + 4}
          className="print-draft"
          role="img"
          aria-label={`Draft of ${name}`}
        >
          {grid('gt', x0, yThread, ends, shafts)}
          {!hideTieup && grid('gu', xTie, yThread, treadles, shafts)}
          {grid('gr', xTie, yDraw, treadles, picks)}
          {cells}
          {drawLines}
          {frames}
          {ticks}
        </svg>
      </div>
      <footer className="print-footer">
        Weave Patterner · weave-patterner.com · printed {new Date().toLocaleDateString()}
      </footer>
      {instructions && (
        <section className="print-instructions" aria-label="Written instructions">
          <h2>{name}: written instructions</h2>
          <h3>Threading (shaft for each end)</h3>
          <ol>
            {threadingLines(draft).map((l) => (
              <li key={l}>{l}</li>
            ))}
          </ol>
          {isDirectTieup(draft) ? (
            <>
              <h3>Lift plan (shafts lifted on each pick)</h3>
              <ol>
                {liftplanLines(draft).map((l) => (
                  <li key={l}>{l}</li>
                ))}
              </ol>
            </>
          ) : (
            <>
              <h3>Tie-up</h3>
              <ol>
                {tieupLines(draft).map((l) => (
                  <li key={l}>{l}</li>
                ))}
              </ol>
              <h3>Treadling (treadle for each pick)</h3>
              <ol>
                {treadlingLines(draft).map((l) => (
                  <li key={l}>{l}</li>
                ))}
              </ol>
            </>
          )}
        </section>
      )}
    </div>
  )
}
