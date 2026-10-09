import CloseIcon from '@mui/icons-material/Close'
import FlipIcon from '@mui/icons-material/Flip'
import ViewColumnIcon from '@mui/icons-material/ViewColumn'
import {
  Alert,
  Box,
  Button,
  IconButton,
  Paper,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from '@mui/material'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { ViewOptions } from '../hooks/useViewOptions'
import { clothView, layerMap } from '../layers'
import { useCompact, usePhone, useTouch } from '../layout'
import { isDirectTieup } from '../liftplan'
import { layerNote, traceCell } from '../trace'
import type { Draft } from '../weave'
import { BlockStrip } from './BlockStrip'
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
  onView: (patch: Partial<ViewOptions>) => void
  /** Marks ends `from` to `to` (0-based) as a block. */
  onAddBlock: (from: number, to: number) => void
  /** Opens the blocks and block store, at block i if given. */
  onBlocks: (i?: number) => void
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
  // Turning the cloth over to see the back swaps left and right, so the whole draft is drawn mirrored.
  const back = view.clothSide === 'back'
  const mirrored = view.endOneRight !== back
  // Drawn column -> end index, and back (the mapping is its own inverse).
  const endAt = (column: number) => (mirrored ? ends - 1 - column : column)
  const columns = Array.from({ length: ends }, (_, c) => endAt(c))
  const liftplan = isDirectTieup(draft)
  // A loom without a tie-up lifts shafts directly: the lift plan needs no tie-up beside it.
  const hideTieup = view.noTieup && liftplan
  const ruler = view.ruler > 0
  // Phones, tablets and touch screens pan the pattern in its own box; desktops and laptops grow it to full size and
  // scroll the page instead.
  const compact = useCompact()
  const phone = usePhone()
  const touch = useTouch()
  const ownScroll = compact || touch

  const sinking = view.sinkingShed
  // The face or back of the cloth, allowing for layers; null for the plain drawdown.
  const cloth = useMemo(
    () => (view.clothSide === 'drawdown' ? null : clothView(draft, view.clothSide, drawdown)),
    [draft, drawdown, view.clothSide],
  )

  // Clicking a drawdown square traces it back to the threading, tie-up and treadling cells that decide it.
  const [selected, setSelected] = useState<{ end: number; pick: number } | null>(null)
  const trace =
    selected && selected.end < ends && selected.pick < picks ? traceCell(draft, selected.end, selected.pick) : null
  // Layers, worked out only while tracing, to say where a crossing is hidden in double cloth.
  const tracing = selected !== null
  const layers = useMemo(
    () => (tracing ? { face: layerMap(draft, 'face', drawdown), back: layerMap(draft, 'back', drawdown) } : null),
    [tracing, draft, drawdown],
  )
  const note = trace && layers ? layerNote(layers, trace.end, trace.pick) : null

  // The drawdown squares the last edit changed, so they can glow for a moment and show what the edit did. A change
  // to most of the cloth (a new pattern, a resize, another view) isn't shown: it would just flash everything.
  const shown = useMemo(
    () =>
      drawdown.flatMap((row, pick) =>
        row.map((up, end) => cloth?.[pick][end].color ?? (up ? draft.warpColors[end] : draft.weftColors[pick])),
      ),
    [drawdown, cloth, draft.warpColors, draft.weftColors],
  )
  const before = useRef<{ shown: string[]; ends: number } | null>(null)
  const [changed, setChanged] = useState<Set<number>>(() => new Set())
  useEffect(() => {
    const last = before.current
    before.current = { shown, ends }
    const diff = new Set<number>()
    if (last && last.ends === ends && last.shown.length === shown.length)
      for (let i = 0; i < shown.length; i++) if (shown[i] !== last.shown[i]) diff.add(i)
    if (diff.size === 0 || diff.size > shown.length * 0.4) {
      setChanged((c) => (c.size ? new Set() : c))
      return
    }
    setChanged(diff)
    const done = setTimeout(() => setChanged(new Set()), 950)
    return () => clearTimeout(done)
  }, [shown, ends])
  useEffect(() => {
    if (!trace) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setSelected(null)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [trace])
  const tracedThreading = (shaft: number, end: number) =>
    trace !== null && end === trace.end && (trace.shaft < 0 || shaft === trace.shaft)
  const tracedTieup = (shaft: number, treadle: number) =>
    trace !== null && shaft === trace.shaft && trace.treadles.includes(treadle)
  const tracedTreadling = (pick: number, treadle: number) =>
    trace !== null && pick === trace.pick && (trace.treadles.length === 0 || trace.treadles.includes(treadle))
  const pad = (n: number) => Array.from({ length: n }, (_, i) => <div key={`pad${i}`} />)
  const cols = ruler ? 4 : 3

  const rulerRow = ruler && (
    <>
      <Ruler
        count={ends}
        every={view.ruler}
        cellSize={p.cellSize}
        orientation="horizontal"
        reversed={mirrored}
        label="End numbers"
      />
      {pad(cols - 1)}
    </>
  )
  const blockRow = (
    <>
      <BlockStrip
        ends={ends}
        blocks={draft.blocks ?? []}
        cellSize={p.cellSize}
        endAt={endAt}
        onAdd={p.onAddBlock}
        onOpen={p.onBlocks}
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
        traced={trace ? endAt(trace.end) : undefined}
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
        help="threading"
        fromRight={mirrored}
        cellLabel={(r, c) => `End ${endAt(c) + 1}, shaft ${shaftAt(r) + 1}`}
        cellText={view.numbers ? (r) => String(shaftAt(r) + 1) : undefined}
        cellColor={view.colorBoxes ? (_, c) => draft.warpColors[endAt(c)] : undefined}
        traced={(r, c) => tracedThreading(shaftAt(r), endAt(c))}
        touchPaint={p.touchPaint}
      />
      {hideTieup ? (
        <div />
      ) : (
        <>
          {/* Sinking shed shows the shafts that go down: the opposite of the (rising) tie-up that is stored. */}
          <Grid
            rows={shafts}
            cols={treadles}
            isOn={(r, t) => draft.tieup[shaftAt(r)][t] !== sinking}
            onPaint={(r, t, v, cont) => p.onTieup(shaftAt(r), t, v !== sinking, cont)}
            label={sinking ? 'Tie-up (sinking shed)' : 'Tie-up'}
            help="tieup"
            traced={(r, t) => tracedTieup(shaftAt(r), t)}
            cellLabel={(r, t) => `Treadle ${t + 1}, shaft ${shaftAt(r) + 1}${sinking ? ' sinks' : ''}`}
            touchPaint={p.touchPaint}
          />
        </>
      )}
      {pad(cols - 2)}
    </>
  )
  const drawdownRow = (
    <>
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: a pointer shortcut; the explanation is shown as text and the same cells are reachable by keyboard in the threading and treadling */}
      <div
        ref={drawdownRef}
        data-help="drawdown"
        className={`grid drawdown${view.fabric ? ' fabric' : ''}${mirrored ? ' from-right' : ''}`}
        role="img"
        aria-label={`${view.clothSide === 'face' ? 'Face of the cloth' : view.clothSide === 'back' ? 'Back of the cloth' : 'Woven pattern'}, ${ends} ends by ${picks} picks. Click a square to see what decides it.`}
        style={{ gridTemplateColumns: `repeat(${ends}, var(--cell))` }}
        onClick={(e) => {
          const square = (e.target as HTMLElement).closest<HTMLElement>('[data-end]')
          if (!square) return
          const end = Number(square.dataset.end)
          const pick = Number(square.dataset.pick)
          setSelected(trace && trace.end === end && trace.pick === pick ? null : { end, pick })
        }}
      >
        {drawdown.flatMap((row, pick) =>
          columns.map((end) => {
            const square = cloth?.[pick][end]
            const warp = square ? square.warp : row[end]
            return (
              <div
                key={`${pick}-${end}`}
                data-end={end}
                data-pick={pick}
                className={`cell ${warp ? 'warp' : 'weft'}${floatMask?.[pick][end] ? ' float' : ''}${trace?.end === end && trace.pick === pick ? ' traced' : ''}${changed.has(pick * ends + end) ? ' changed' : ''}`}
                style={{
                  backgroundColor: square ? square.color : warp ? draft.warpColors[end] : draft.weftColors[pick],
                }}
              />
            )
          }),
        )}
      </div>
      <Grid
        rows={picks}
        cols={treadles}
        isOn={(pick, t) => draft.treadling[pick][t]}
        onPaint={p.onTreadling}
        label={liftplan ? 'Lift plan' : 'Treadling'}
        help="treadling"
        cellLabel={(pick, t) => `Pick ${pick + 1}, ${liftplan ? 'shaft' : 'treadle'} ${t + 1}`}
        cellText={view.numbers ? (_, t) => String(t + 1) : undefined}
        cellColor={view.colorBoxes ? (pick) => draft.weftColors[pick] : undefined}
        traced={tracedTreadling}
        touchPaint={p.touchPaint}
      />
      <ColorStrip
        vertical
        colors={draft.weftColors}
        onChange={p.onWeftColor}
        labelAt={(i) => `Weft ${i + 1}`}
        traced={trace?.pick}
      />
      {ruler && (
        <Ruler count={picks} every={view.ruler} cellSize={p.cellSize} orientation="vertical" label="Pick numbers" />
      )}
    </>
  )

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
      {trace && (
        <Alert
          severity="info"
          data-testid="trace-info"
          sx={{
            position: 'fixed',
            zIndex: 1200,
            left: '50%',
            transform: 'translateX(-50%)',
            bottom: phone
              ? 'calc(140px + env(safe-area-inset-bottom, 0px))'
              : 'calc(60px + env(safe-area-inset-bottom, 0px))',
            width: 'max-content',
            maxWidth: 'calc(100vw - 32px)',
            boxShadow: 6,
          }}
          action={
            <IconButton size="small" aria-label="Stop tracing" onClick={() => setSelected(null)}>
              <CloseIcon fontSize="small" />
            </IconButton>
          }
        >
          {trace.explanation}
          {note && ` ${note}`}
        </Alert>
      )}
      <Stack
        direction="row"
        sx={{
          gap: '10px 16px',
          alignItems: 'center',
          flexWrap: 'wrap',
          px: { xs: 1.75, sm: 3 },
          py: 1.5,
          borderBottom: 1,
          borderColor: 'divider',
          // Take the width the draft gives, rather than widening the page to fit on one line.
          width: 0,
          minWidth: '100%',
          boxSizing: 'border-box',
        }}
      >
        <ToggleButtonGroup
          exclusive
          size="small"
          value={view.clothSide}
          onChange={(_, side) => side && p.onView({ clothSide: side })}
          aria-label="Show the drawdown, or the face or back of the cloth"
          data-help="drawdown"
        >
          <ToggleButton value="drawdown">Drawdown</ToggleButton>
          <ToggleButton value="face">Face</ToggleButton>
          <ToggleButton value="back">
            <FlipIcon fontSize="small" sx={{ mr: 0.5 }} />
            Back
          </ToggleButton>
        </ToggleButtonGroup>
        <ToggleButtonGroup
          exclusive
          size="small"
          value={view.drawTool}
          onChange={(_, tool) => tool && p.onView({ drawTool: tool })}
          aria-label="Drawing tool"
          data-help="drawing"
        >
          <Tooltip title="Click or drag to set boxes one at a time" describeChild>
            <ToggleButton value="click">Click</ToggleButton>
          </Tooltip>
          <Tooltip title="Drag along the threading or treadling to draw 1 2 3 4 1 2 …" describeChild>
            <ToggleButton value="straight">Straight draw</ToggleButton>
          </Tooltip>
          <Tooltip title="Drag along the threading or treadling to draw 1 2 3 4 3 2 1 …" describeChild>
            <ToggleButton value="point">Point draw</ToggleButton>
          </Tooltip>
        </ToggleButtonGroup>
        <Button
          color="inherit"
          startIcon={<ViewColumnIcon />}
          onClick={() => p.onBlocks()}
          sx={{ height: 40 }}
          data-help="blocks"
        >
          Blocks
        </Button>
        {back && (
          <Typography variant="body2" color="text.secondary" data-testid="back-note">
            Turned over: left and right are swapped, so end 1 is on the {mirrored ? 'right' : 'left'}.
          </Typography>
        )}
        {!compact && !touch && (
          <>
            <Box sx={{ flex: '1 1 0px' }} />
            <Typography variant="body2" color="text.secondary">
              Click or drag on the grids · arrow keys and Space work too
            </Typography>
          </>
        )}
      </Stack>
      <Box sx={{ px: { xs: 1.25, sm: 3 }, py: { xs: 1.25, sm: 4 }, display: 'flex', justifyContent: 'center' }}>
        <Paper
          variant="outlined"
          className="draft-scroll wp-enter"
          data-scroll={ownScroll ? 'own' : 'page'}
          sx={{
            borderRadius: { xs: '20px', sm: '26px' },
            bgcolor: 'var(--wp-paper)',
            boxShadow: '0 1px 2px var(--wp-shadow-soft), 0 12px 32px var(--wp-shadow)',
            boxSizing: 'border-box',
            ...(ownScroll
              ? {
                  p: { xs: 1.75, sm: 3 },
                  overflow: 'auto',
                  maxWidth: '100%',
                  // Fill the screen between the toolbars so the pattern pans in both directions in one place.
                  maxHeight: phone ? 'calc(100dvh - 250px)' : 'calc(100dvh - 200px)',
                  // Stop horizontal pans at the edge from triggering browser back/forward swipes.
                  overscrollBehaviorX: 'contain',
                }
              : { p: '28px 30px 30px', width: 'max-content' }),
          }}
        >
          <div
            ref={container}
            className="draft"
            data-layout={view.threadingBelow ? 'threading-below' : 'threading-above'}
            style={{ ['--cell' as string]: `${p.cellSize}px`, gridTemplateColumns: `repeat(${cols}, max-content)` }}
          >
            {!view.threadingBelow && blockRow}
            {rulerRow}
            {view.threadingBelow ? (
              <>
                {drawdownRow}
                {threadingRow}
                {warpRow}
                {blockRow}
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
      </Box>
    </Box>
  )
}
