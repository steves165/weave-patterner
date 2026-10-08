import { Paper } from '@mui/material'
import { useRef } from 'react'
import type { ViewOptions } from '../hooks/useViewOptions'
import { isDirectTieup } from '../liftplan'
import type { Draft } from '../weave'
import { Crosshair } from './Crosshair'
import { ColorStrip, Grid } from './Grid'
import { Ruler } from './Ruler'

interface Props {
  draft: Draft
  drawdown: boolean[][]
  /** Cells to highlight as long floats, or null when highlighting is off. */
  floatMask: boolean[][] | null
  cellSize: number
  view: ViewOptions
  touchPaint: boolean
  onThreading: (shaftRow: number, end: number, value: boolean, continuing: boolean) => void
  onTieup: (shaftRow: number, treadle: number, value: boolean, continuing: boolean) => void
  onTreadling: (pick: number, treadle: number, value: boolean, continuing: boolean) => void
  onWarpColor: (end: number, color: string) => void
  onWeftColor: (pick: number, color: string) => void
}

/**
 * The draft in the classic layout, in its own scroll box: rulers, warp colours and threading above the drawdown,
 * tie-up top right, treadling (or lift plan), weft colours and ruler to the right. Shaft 1 is drawn at the
 * bottom of the threading and tie-up. With `endOneRight`, ends are drawn right to left; the data is unchanged.
 */
export function DraftView(p: Props) {
  const { draft, drawdown, floatMask, view } = p
  const { shafts, treadles, ends, picks } = draft
  const container = useRef<HTMLDivElement>(null)
  const drawdownRef = useRef<HTMLDivElement>(null)
  const shaftAt = (row: number) => shafts - 1 - row
  // Drawn column -> end index, and back (the mapping is its own inverse).
  const endAt = (column: number) => (view.endOneRight ? ends - 1 - column : column)
  const columns = Array.from({ length: ends }, (_, c) => endAt(c))
  const liftplan = isDirectTieup(draft)
  const ruler = view.ruler > 0

  return (
    <Paper
      variant="outlined"
      className="draft-scroll"
      sx={{
        p: { xs: 1, sm: 2 },
        overflow: 'auto',
        // Fill the screen below the toolbar so the pattern pans in both directions in one place.
        maxHeight: { xs: 'calc(100dvh - 72px)', sm: 'calc(100dvh - 96px)' },
        // Stop horizontal pans at the edge from triggering browser back/forward swipes.
        overscrollBehaviorX: 'contain',
      }}
    >
      <div
        ref={container}
        className="draft"
        style={{
          ['--cell' as string]: `${p.cellSize}px`,
          gridTemplateColumns: `repeat(${ruler ? 4 : 3}, max-content)`,
        }}
      >
        {/* row 0: ruler over the ends */}
        {ruler && (
          <>
            <Ruler
              count={ends}
              every={view.ruler}
              cellSize={p.cellSize}
              orientation="horizontal"
              reversed={view.endOneRight}
              label="End numbers"
            />
            <div />
            <div />
            <div />
          </>
        )}

        {/* row 1: warp colours */}
        <ColorStrip
          colors={columns.map((e) => draft.warpColors[e])}
          onChange={(c, color) => p.onWarpColor(endAt(c), color)}
          labelAt={(c) => `Warp ${endAt(c) + 1}`}
        />
        <div />
        <div />
        {ruler && <div />}

        {/* row 2: threading + tie-up */}
        <Grid
          rows={shafts}
          cols={ends}
          isOn={(r, c) => draft.threading[endAt(c)] === shaftAt(r)}
          onPaint={(r, c, v, cont) => p.onThreading(r, endAt(c), v, cont)}
          label="Threading"
          cellLabel={(r, c) => `End ${endAt(c) + 1}, shaft ${shaftAt(r) + 1}`}
          cellText={view.numbers ? (r) => String(shaftAt(r) + 1) : undefined}
          touchPaint={p.touchPaint}
        />
        <Grid
          rows={shafts}
          cols={treadles}
          isOn={(r, t) => draft.tieup[shaftAt(r)][t]}
          onPaint={p.onTieup}
          label="Tie-up"
          cellLabel={(r, t) => `Treadle ${t + 1}, shaft ${shaftAt(r) + 1}`}
          touchPaint={p.touchPaint}
        />
        <div />
        {ruler && <div />}

        {/* row 3: drawdown + treadling + weft colours */}
        <div
          ref={drawdownRef}
          className="grid drawdown"
          role="img"
          aria-label={`Woven pattern, ${ends} ends by ${picks} picks`}
          style={{ gridTemplateColumns: `repeat(${ends}, var(--cell))` }}
        >
          {drawdown.flatMap((row, pick) =>
            columns.map((end) => (
              <div
                key={`${pick}-${end}`}
                className={floatMask?.[pick][end] ? 'cell float' : 'cell'}
                style={{ background: row[end] ? draft.warpColors[end] : draft.weftColors[pick] }}
              />
            )),
          )}
        </div>
        <Grid
          rows={picks}
          cols={treadles}
          isOn={(pick, t) => draft.treadling[pick][t]}
          onPaint={p.onTreadling}
          label={liftplan ? 'Lift plan' : 'Treadling'}
          cellLabel={(pick, t) => `Pick ${pick + 1}, ${liftplan ? 'shaft' : 'treadle'} ${t + 1}`}
          cellText={view.numbers ? (_, t) => String(t + 1) : undefined}
          touchPaint={p.touchPaint}
        />
        <ColorStrip vertical colors={draft.weftColors} onChange={p.onWeftColor} labelAt={(i) => `Weft ${i + 1}`} />
        {ruler && (
          <Ruler count={picks} every={view.ruler} cellSize={p.cellSize} orientation="vertical" label="Pick numbers" />
        )}

        <Crosshair
          container={container}
          drawdown={drawdownRef}
          cellSize={p.cellSize}
          ends={ends}
          picks={picks}
          endAt={endAt}
        />
      </div>
    </Paper>
  )
}
