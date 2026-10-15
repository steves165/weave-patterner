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
import { memo, useEffect, useMemo, useRef, useState } from 'react'
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
  /** Drawing on the drawdown (with the Draw cloth tool): a square set to warp or weft; `continuing` in a drag. */
  onDrawCloth: (pick: number, end: number, warp: boolean, continuing: boolean) => void
  onWarpColor: (end: number, color: string) => void
  onWeftColor: (pick: number, color: string) => void
  onView: (patch: Partial<ViewOptions>) => void
  /** Marks ends `from` to `to` (0-based) as a block. */
  onAddBlock: (from: number, to: number) => void
  /** Opens the blocks and block store, at block i if given. */
  onBlocks: (i?: number) => void
  /** Show the strip for marking blocks of ends even before there are any (once the Blocks dialog has been opened). */
  blockStrip: boolean
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
  // While drawing on it, the plain drawdown: what's drawn is which thread is on top.
  const drawing = view.drawCloth
  const cloth = useMemo(
    () => (view.clothSide === 'drawdown' || drawing ? null : clothView(draft, view.clothSide, drawdown)),
    [draft, drawdown, view.clothSide, drawing],
  )
  /**
   * A drawing stroke: the value being drawn, the square and pointer it started at, and how far apart squares are on
   * screen then. Squares are found by how far the pointer has moved since, so a drag stays on its row even when a new
   * shaft pushes the drawdown down the page.
   */
  const drawStroke = useRef<{
    warp: boolean
    last: string
    pick: number
    end: number
    x: number
    y: number
    dx: number
    dy: number
  } | null>(null)
  const squareAt = (x: number, y: number) => {
    const el = document.elementFromPoint(x, y)?.closest<HTMLElement>('.drawdown [data-end]')
    return el ? { end: Number(el.dataset.end), pick: Number(el.dataset.pick), el } : null
  }
  /** The distance on screen from one square to the next, across (ends) and down (picks). */
  const squarePitch = (pick: number, end: number, el: HTMLElement) => {
    const at = el.getBoundingClientRect()
    const box = (p: number, e: number) =>
      drawdownRef.current?.querySelector<HTMLElement>(`[data-pick="${p}"][data-end="${e}"]`)?.getBoundingClientRect()
    const across = box(pick, end + 1) ?? box(pick, end - 1)
    const down = box(pick + 1, end) ?? box(pick - 1, end)
    const dx = across ? (across.left - at.left) * (box(pick, end + 1) ? 1 : -1) : at.width
    const dy = down ? (down.top - at.top) * (box(pick + 1, end) ? 1 : -1) : at.height
    return { dx: dx || at.width, dy: dy || at.height }
  }
  useEffect(() => {
    const stop = () => {
      drawStroke.current = null
    }
    window.addEventListener('pointerup', stop)
    window.addEventListener('pointercancel', stop)
    return () => {
      window.removeEventListener('pointerup', stop)
      window.removeEventListener('pointercancel', stop)
    }
  }, [])

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
  // The strip for marking blocks of ends shows once there are blocks, or the Blocks dialog has been opened.
  const blockRow = ((draft.blocks?.length ?? 0) > 0 || p.blockStrip) && (
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
        className={`grid drawdown${view.fabric ? ' fabric' : ''}${mirrored ? ' from-right' : ''}${drawing ? ' drawing' : ''}`}
        role="img"
        aria-label={
          drawing
            ? `Woven pattern, ${ends} ends by ${picks} picks. Drawing: click or drag across squares to swap warp and weft.`
            : `${view.clothSide === 'face' ? 'Face of the cloth' : view.clothSide === 'back' ? 'Back of the cloth' : 'Woven pattern'}, ${ends} ends by ${picks} picks. Click a square to see what decides it.`
        }
        style={{ gridTemplateColumns: `repeat(${ends}, var(--cell))`, touchAction: drawing ? 'none' : undefined }}
        onPointerDown={(e) => {
          if (!drawing || e.button !== 0) return
          const at = squareAt(e.clientX, e.clientY)
          if (!at) return
          e.preventDefault()
          const warp = !drawdown[at.pick][at.end]
          ;(e.target as Element).setPointerCapture?.(e.pointerId)
          drawStroke.current = {
            warp,
            last: `${at.pick},${at.end}`,
            pick: at.pick,
            end: at.end,
            x: e.clientX,
            y: e.clientY,
            ...squarePitch(at.pick, at.end, at.el),
          }
          p.onDrawCloth(at.pick, at.end, warp, false)
        }}
        onPointerMove={(e) => {
          const s = drawStroke.current
          if (!drawing || !s) return
          const end = s.end + Math.round((e.clientX - s.x) / s.dx)
          const pick = s.pick + Math.round((e.clientY - s.y) / s.dy)
          if (end < 0 || end >= ends || pick < 0 || pick >= picks || `${pick},${end}` === s.last) return
          // Every square along the way, so a quick drag leaves no gaps.
          const [lp, le] = s.last.split(',').map(Number)
          const steps = Math.max(Math.abs(pick - lp), Math.abs(end - le))
          for (let k = 1; k <= steps; k++) {
            const q = Math.round(lp + ((pick - lp) * k) / steps)
            const r = Math.round(le + ((end - le) * k) / steps)
            p.onDrawCloth(q, r, s.warp, true)
          }
          s.last = `${pick},${end}`
        }}
        onClick={(e) => {
          if (drawing) return
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
        <Tooltip title="Shade the drawdown like woven threads" describeChild>
          <ToggleButton
            size="small"
            value="fabric"
            selected={view.fabric}
            onChange={() => p.onView({ fabric: !view.fabric })}
          >
            Fabric
          </ToggleButton>
        </Tooltip>
        <ToggleButtonGroup
          exclusive
          size="small"
          value={drawing ? 'cloth' : view.drawTool}
          onChange={(_, tool) =>
            tool && p.onView(tool === 'cloth' ? { drawCloth: true } : { drawTool: tool, drawCloth: false })
          }
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
          <Tooltip title="Click or drag on the drawdown to swap squares between warp and weft" describeChild>
            <ToggleButton value="cloth">Draw cloth</ToggleButton>
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
        {drawing ? (
          <>
            <Box sx={{ flex: '1 1 0px' }} />
            <Stack
              direction="row"
              data-testid="draw-hint"
              sx={{ gap: 1, alignItems: 'center', px: 1.25, py: 0.5, borderRadius: 3, bgcolor: 'var(--wp-seg)' }}
            >
              <Typography variant="body2">
                Drawing on the drawdown: {touch ? 'tap or drag' : 'click or drag'} to swap warp and weft
              </Typography>
              <Button size="small" onClick={() => p.onView({ drawCloth: false })}>
                Stop drawing
              </Button>
            </Stack>
          </>
        ) : (
          !compact &&
          !touch && (
            <>
              <Box sx={{ flex: '1 1 0px' }} />
              <Typography variant="body2" color="text.secondary">
                Click or drag on the grids · arrow keys and Space work too
              </Typography>
            </>
          )
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

const DraftViewMemo = memo(DraftView)

/**
 * The draft view, drawn again only when what it shows changes: not when a menu or dialog opens elsewhere, which for a
 * big draft (a whole tartan sett) would redraw tens of thousands of squares. Its handlers are swapped for steady ones
 * that always call the latest, so they never go stale.
 */
export function SteadyDraftView(p: Props) {
  const latest = useRef(p)
  latest.current = p
  const steady = useRef<Partial<Props>>({})
  const props = { ...p }
  for (const [k, v] of Object.entries(p) as [keyof Props, unknown][]) {
    if (typeof v !== 'function') continue
    steady.current[k] ??= ((...args: unknown[]) =>
      (latest.current[k] as (...a: unknown[]) => unknown)(...args)) as never
    ;(props as Record<string, unknown>)[k] = steady.current[k]
  }
  return <DraftViewMemo {...props} />
}
