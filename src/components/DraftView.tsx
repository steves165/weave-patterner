import { Paper } from '@mui/material'
import type { Draft } from '../weave'
import { ColorStrip, Grid } from './Grid'

interface Props {
  draft: Draft
  drawdown: boolean[][]
  /** Cells to highlight as long floats, or null when highlighting is off. */
  floatMask: boolean[][] | null
  cellSize: number
  touchPaint: boolean
  onThreading: (shaftRow: number, end: number, value: boolean, continuing: boolean) => void
  onTieup: (shaftRow: number, treadle: number, value: boolean, continuing: boolean) => void
  onTreadling: (pick: number, treadle: number, value: boolean, continuing: boolean) => void
  onWarpColor: (end: number, color: string) => void
  onWeftColor: (pick: number, color: string) => void
}

/**
 * The draft in the classic layout, in its own scroll box: warp colours and threading above the drawdown, tie-up
 * top right, treadling and weft colours to the right. Shaft 1 is drawn at the bottom of the threading and tie-up.
 */
export function DraftView(p: Props) {
  const { draft, drawdown, floatMask } = p
  const { shafts, treadles, ends, picks } = draft
  const shaftAt = (row: number) => shafts - 1 - row

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
      <div className="draft" style={{ ['--cell' as string]: `${p.cellSize}px` }}>
        {/* row 1: warp colours */}
        <ColorStrip colors={draft.warpColors} onChange={p.onWarpColor} />
        <div />
        <div />

        {/* row 2: threading + tie-up */}
        <Grid
          rows={shafts}
          cols={ends}
          isOn={(r, c) => draft.threading[c] === shaftAt(r)}
          onPaint={p.onThreading}
          label="Threading"
          cellLabel={(r, c) => `End ${c + 1}, shaft ${shaftAt(r) + 1}`}
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

        {/* row 3: drawdown + treadling + weft colours */}
        <div
          className="grid drawdown"
          role="img"
          aria-label={`Woven pattern, ${ends} ends by ${picks} picks`}
          style={{ gridTemplateColumns: `repeat(${ends}, var(--cell))` }}
        >
          {drawdown.flatMap((row, pick) =>
            row.map((warpUp, end) => (
              <div
                key={`${pick}-${end}`}
                className={floatMask?.[pick][end] ? 'cell float' : 'cell'}
                style={{ background: warpUp ? draft.warpColors[end] : draft.weftColors[pick] }}
              />
            )),
          )}
        </div>
        <Grid
          rows={picks}
          cols={treadles}
          isOn={(pick, t) => draft.treadling[pick][t]}
          onPaint={p.onTreadling}
          label="Treadling"
          cellLabel={(pick, t) => `Pick ${pick + 1}, treadle ${t + 1}`}
          touchPaint={p.touchPaint}
        />
        <ColorStrip vertical colors={draft.weftColors} onChange={p.onWeftColor} />
      </div>
    </Paper>
  )
}
