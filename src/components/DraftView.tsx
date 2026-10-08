import { Paper } from '@mui/material'
import { useRef } from 'react'
import type { ViewOptions } from '../hooks/useViewOptions'
import { useCompact, useTouch } from '../layout'
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
  /** Shaft and end indices are 0-based data indices, whatever the display options. */
  onThreading: (shaft: number, end: number, value: boolean, continuing: boolean) => void
  onTieup: (shaft: number, treadle: number, value: boolean, continuing: boolean) => void
  onTreadling: (pick: number, treadle: number, value: boolean, continuing: boolean) => void
  onWarpColor: (end: number, color: string) => void
  onWeftColor: (pick: number, color: string) => void
}

/**
 * The draft in the classic layout, in its own scroll box: rulers, warp colours and threading above the drawdown,
 * tie-up top right, treadling (or lift plan), weft colours and ruler to the right; or with the threading and
 * tie-up below the drawdown. Display options (end 1 on the right, sinking shed, fabric view) change only how the
 * draft is drawn, never the data.
 */
export function DraftView(p: Props) {
  const { draft, drawdown, floatMask, view } = p
  const { shafts, treadles, ends, picks } = draft
  const container = useRef<HTMLDivElement>(null)
  const drawdownRef = useRef<HTMLDivElement>(null)
  // Shaft 1 sits next to the drawdown: the bottom row of the threading normally, the top row when it's below.
  const shaftAt = (row: number) => (view.threadingBelow ? row : shafts - 1 - row)
  // Drawn column -> end index, and back (the mapping is its own inverse).
  const endAt = (column: number) => (view.endOneRight ? ends - 1 - column : column)
  const columns = Array.from({ length: ends }, (_, c) => endAt(c))
  const liftplan = isDirectTieup(draft)
  const ruler = view.ruler > 0
  // Phones, tablets and touch screens pan the pattern in its own box; desktops and laptops grow it to full size and
  // scroll the page instead.
  const compact = useCompact()
  const touch = useTouch()
  const ownScroll = compact || touch

  const sinking = view.sinkingShed
  const pad = (n: number) => Array.from({ length: n }, (_, i) => <div key={`pad${i}`} />)
  const cols = ruler ? 4 : 3

  const rulerRow = ruler && (
    <>
      <Ruler
        count={ends}
        every={view.ruler}
        cellSize={p.cellSize}
        orientation="horizontal"
        reversed={view.endOneRight}
        label="End numbers"
      />
      {pad(cols - 1)}
    </>
  )
  const warpRow = (
    <>
      <ColorStrip
        colors={columns.map((e) => draft.warpColors[e])}
        onChange={(c, color) => p.onWarpColor(endAt(c), color)}
        labelAt={(c) => `Warp ${endAt(c) + 1}`}
      />
      {pad(cols - 1)}
    </>
  )
  const threadingRow = (
    <>
      <Grid
        rows={shafts}
        cols={ends}
        isOn={(r, c) => draft.threading[endAt(c)] === shaftAt(r)}
        onPaint={(r, c, v, cont) => p.onThreading(shaftAt(r), endAt(c), v, cont)}
        label="Threading"
        cellLabel={(r, c) => `End ${endAt(c) + 1}, shaft ${shaftAt(r) + 1}`}
        cellText={view.numbers ? (r) => String(shaftAt(r) + 1) : undefined}
        cellColor={view.colorBoxes ? (_, c) => draft.warpColors[endAt(c)] : undefined}
        touchPaint={p.touchPaint}
      />
      {/* Sinking shed shows the shafts that go down: the opposite of the (rising) tie-up that is stored. */}
      <Grid
        rows={shafts}
        cols={treadles}
        isOn={(r, t) => draft.tieup[shaftAt(r)][t] !== sinking}
        onPaint={(r, t, v, cont) => p.onTieup(shaftAt(r), t, v !== sinking, cont)}
        label={sinking ? 'Tie-up (sinking shed)' : 'Tie-up'}
        cellLabel={(r, t) => `Treadle ${t + 1}, shaft ${shaftAt(r) + 1}${sinking ? ' sinks' : ''}`}
        touchPaint={p.touchPaint}
      />
      {pad(cols - 2)}
    </>
  )
  const drawdownRow = (
    <>
      <div
        ref={drawdownRef}
        className={`grid drawdown${view.fabric ? ' fabric' : ''}`}
        role="img"
        aria-label={`Woven pattern, ${ends} ends by ${picks} picks`}
        style={{ gridTemplateColumns: `repeat(${ends}, var(--cell))` }}
      >
        {drawdown.flatMap((row, pick) =>
          columns.map((end) => (
            <div
              key={`${pick}-${end}`}
              className={`cell ${row[end] ? 'warp' : 'weft'}${floatMask?.[pick][end] ? ' float' : ''}`}
              style={{ backgroundColor: row[end] ? draft.warpColors[end] : draft.weftColors[pick] }}
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
        cellColor={view.colorBoxes ? (pick) => draft.weftColors[pick] : undefined}
        touchPaint={p.touchPaint}
      />
      <ColorStrip vertical colors={draft.weftColors} onChange={p.onWeftColor} labelAt={(i) => `Weft ${i + 1}`} />
      {ruler && (
        <Ruler count={picks} every={view.ruler} cellSize={p.cellSize} orientation="vertical" label="Pick numbers" />
      )}
    </>
  )

  return (
    <Paper
      variant="outlined"
      className="draft-scroll"
      data-scroll={ownScroll ? 'own' : 'page'}
      sx={
        ownScroll
          ? {
              p: { xs: 1, sm: 2 },
              overflow: 'auto',
              // Fill the screen below the toolbar so the pattern pans in both directions in one place.
              maxHeight: { xs: 'calc(100dvh - 72px)', sm: 'calc(100dvh - 96px)' },
              // Stop horizontal pans at the edge from triggering browser back/forward swipes.
              overscrollBehaviorX: 'contain',
            }
          : { p: 2, width: 'max-content', minWidth: '100%', boxSizing: 'border-box' }
      }
    >
      <div
        ref={container}
        className="draft"
        data-layout={view.threadingBelow ? 'threading-below' : 'threading-above'}
        style={{ ['--cell' as string]: `${p.cellSize}px`, gridTemplateColumns: `repeat(${cols}, max-content)` }}
      >
        {rulerRow}
        {view.threadingBelow ? (
          <>
            {drawdownRow}
            {threadingRow}
            {warpRow}
          </>
        ) : (
          <>
            {warpRow}
            {threadingRow}
            {drawdownRow}
          </>
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
