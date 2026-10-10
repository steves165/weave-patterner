import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/DeleteOutlined'
import {
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  MenuItem,
  Stack,
  Switch,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import { type PointerEvent, useEffect, useRef, useState } from 'react'
import { FIELD_GRID } from '../components/SettingsPanel'
import { drawPiece } from './drawing'
import { type Extra, extraPiece } from './extras'
import { NumberField } from './fields'
import { bounds } from './geometry'
import { fromUnits, toUnits, type Units } from './measurements'
import { ItemsSvg } from './PatternView'
import { type Allowances, FABRIC_NAMES, type Fabric, outlines } from './pattern'

/**
 * Edit one of your own pieces: its shape and size, or its points (drag them, click the outline to add one, double-click
 * one to make it smooth), and how to cut it.
 */
export function ExtraDialog({
  extra,
  units,
  allowances,
  onSave,
  onClose,
}: {
  extra: Extra | null
  units: Units
  allowances: Allowances
  onSave: (e: Extra) => void
  onClose: () => void
}) {
  const [e, setE] = useState<Extra | null>(extra)
  const [selected, setSelected] = useState<number | null>(null)
  useEffect(() => {
    setE(extra)
    setSelected(null)
  }, [extra])
  if (!e) return null
  const set = (patch: Partial<Extra>) => setE({ ...e, ...patch })
  const len = (cm: number) => toUnits(cm, units)
  const cm = (v: number) => Math.round(fromUnits(v, units) * 10) / 10
  const u = units === 'cm' ? 'cm' : 'in'
  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="md" aria-labelledby="extra-title">
      <DialogTitle id="extra-title">{e.shape === 'drawn' ? 'Draw a piece' : 'Your piece'}</DialogTitle>
      <DialogContent>
        <Stack direction={{ xs: 'column', md: 'row' }} sx={{ gap: 3, pt: 1 }}>
          <Stack sx={{ gap: 2, flex: '0 0 280px' }}>
            <TextField size="small" label="Name" value={e.name} onChange={(x) => set({ name: x.target.value })} />
            <TextField
              select
              size="small"
              label="Shape"
              value={e.shape}
              onChange={(x) => set({ shape: x.target.value as Extra['shape'] })}
            >
              <MenuItem value="rect">Rectangle</MenuItem>
              <MenuItem value="circle">Circle</MenuItem>
              <MenuItem value="drawn">Drawn point by point</MenuItem>
            </TextField>
            {e.shape === 'rect' && (
              <Box sx={FIELD_GRID}>
                <NumberField
                  label={`Width (${u})`}
                  value={len(e.w)}
                  min={len(1)}
                  max={len(500)}
                  onChange={(v) => set({ w: cm(v) })}
                />
                <NumberField
                  label={`Length (${u})`}
                  value={len(e.h)}
                  min={len(1)}
                  max={len(500)}
                  onChange={(v) => set({ h: cm(v) })}
                />
              </Box>
            )}
            {e.shape === 'circle' && (
              <NumberField
                label={`Diameter (${u})`}
                value={len(e.w)}
                min={len(1)}
                max={len(300)}
                onChange={(v) => set({ w: cm(v) })}
              />
            )}
            <Box sx={FIELD_GRID}>
              <NumberField
                label="How many to cut"
                value={e.cut}
                min={1}
                max={20}
                step={1}
                onChange={(v) => set({ cut: Math.round(v) })}
              />
              <TextField
                select
                size="small"
                label="Fabric"
                value={e.fabric}
                onChange={(x) => set({ fabric: x.target.value as Fabric })}
              >
                {(Object.keys(FABRIC_NAMES) as Fabric[]).map((f) => (
                  <MenuItem key={f} value={f}>
                    {FABRIC_NAMES[f]}
                  </MenuItem>
                ))}
              </TextField>
            </Box>
            <TextField
              select
              size="small"
              label="Edges"
              value={e.edges}
              onChange={(x) => set({ edges: x.target.value as Extra['edges'] })}
            >
              <MenuItem value="seam">Seam allowance</MenuItem>
              <MenuItem value="hem">Hem allowance</MenuItem>
              <MenuItem value="raw">None (bound or folded in)</MenuItem>
            </TextField>
            {e.shape !== 'circle' && (
              <FormControlLabel
                control={<Switch checked={e.onFold} onChange={(x) => set({ onFold: x.target.checked })} />}
                label={
                  e.shape === 'drawn' ? 'On the fold (the edge along the left, at 0)' : 'On the fold (the left edge)'
                }
              />
            )}
            <FormControlLabel
              control={<Switch checked={e.pair} onChange={(x) => set({ pair: x.target.checked })} />}
              label="Cut in mirror-image pairs"
            />
            <FormControlLabel
              control={<Switch checked={e.bias} onChange={(x) => set({ bias: x.target.checked })} />}
              label="On the bias"
            />
          </Stack>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            {e.shape === 'drawn' ? (
              <PointEditor
                extra={e}
                units={units}
                selected={selected}
                onSelect={setSelected}
                onChange={(points) => set({ points })}
              />
            ) : (
              <Preview extra={e} allowances={allowances} />
            )}
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={() => onSave(e)}>
          Done
        </Button>
      </DialogActions>
    </Dialog>
  )
}

function Preview({ extra, allowances }: { extra: Extra; allowances: Allowances }) {
  const piece = extraPiece(extra)
  const items = drawPiece(piece, allowances)
  const b = bounds(outlines(piece, allowances).cut)
  return (
    <svg
      viewBox={`${b.x - 2} ${b.y - 2} ${b.w + 4} ${b.h + 4}`}
      style={{ width: '100%', maxHeight: 360, background: 'var(--sew-paper)', borderRadius: 12 }}
      role="img"
      aria-label={`${extra.name}: preview`}
    >
      <ItemsSvg items={items} minStroke={Math.max(b.w, b.h) / 400} />
    </svg>
  )
}

/** The drawing grid: points to drag, the outline to click for a new point, and a table of the points. */
function PointEditor({
  extra,
  units,
  selected,
  onSelect,
  onChange,
}: {
  extra: Extra
  units: Units
  selected: number | null
  onSelect: (i: number | null) => void
  onChange: (points: Extra['points']) => void
}) {
  const svg = useRef<SVGSVGElement>(null)
  const drag = useRef<number | null>(null)
  const pts = extra.points
  const piece = extraPiece(extra)
  const sew = outlines(piece, { include: false, seam: 0, hem: 0 }).sew
  const b = bounds([...pts, { x: 0, y: 0 }])
  const pad = Math.max(8, Math.max(b.w, b.h) * 0.2)
  const view = { x: Math.min(0, b.x) - pad, y: Math.min(0, b.y) - pad, w: b.w + pad * 2, h: b.h + pad * 2 }
  const r = Math.max(view.w, view.h) / 70
  const toCm = (ev: PointerEvent | { clientX: number; clientY: number }) => {
    const m = svg.current?.getScreenCTM()
    if (!m) return null
    const p = new DOMPoint(ev.clientX, ev.clientY).matrixTransform(m.inverse())
    // To the nearest half centimetre (eighth of an inch).
    const snap = units === 'cm' ? 0.5 : 0.3175
    return { x: Math.round(p.x / snap) * snap, y: Math.round(p.y / snap) * snap }
  }
  const len = (cm: number) => toUnits(cm, units)
  const u = units === 'cm' ? 'cm' : 'in'
  return (
    <Stack sx={{ gap: 1.5 }}>
      <Typography variant="body2" color="text.secondary">
        Drag the points. Click the outline to add a point there, and double-click a point to make it smooth or a corner.
        The grid is in 5 cm squares; the fold, if it's cut on the fold, is the dashed line.
      </Typography>
      <svg
        ref={svg}
        viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`}
        style={{ width: '100%', maxHeight: 380, background: 'var(--sew-paper)', borderRadius: 12, touchAction: 'none' }}
        role="img"
        aria-label={`${extra.name}: ${pts.length} points`}
        onPointerMove={(ev) => {
          if (drag.current === null) return
          const q = toCm(ev)
          if (!q) return
          onChange(pts.map((p, i) => (i === drag.current ? { ...p, ...q } : p)))
        }}
        onPointerUp={() => {
          drag.current = null
        }}
      >
        <defs>
          <pattern id="extra-grid" width={5} height={5} patternUnits="userSpaceOnUse">
            <path d="M5 0 L0 0 0 5" fill="none" stroke="var(--sew-grid)" strokeWidth={view.w / 600} />
          </pattern>
        </defs>
        <rect x={view.x} y={view.y} width={view.w} height={view.h} fill="url(#extra-grid)" />
        <line
          x1={0}
          y1={view.y}
          x2={0}
          y2={view.y + view.h}
          stroke="var(--sew-mark)"
          strokeWidth={view.w / 500}
          strokeDasharray={`${r} ${r}`}
        />
        {/* biome-ignore lint/a11y/noStaticElementInteractions: the table of points below does the same from the keyboard */}
        <polygon
          points={sew.map((q) => `${q.x},${q.y}`).join(' ')}
          fill="var(--sew-fabric)"
          fillOpacity={0.5}
          stroke="var(--sew-ink)"
          strokeWidth={view.w / 300}
          style={{ cursor: 'copy' }}
          onClick={(ev) => {
            const q = toCm(ev)
            if (!q) return
            // Into the edge nearest the click.
            let best = 0
            let bestD = Infinity
            for (let i = 0; i < pts.length; i++) {
              const a = pts[i]
              const c = pts[(i + 1) % pts.length]
              const d = Math.hypot(q.x - (a.x + c.x) / 2, q.y - (a.y + c.y) / 2)
              if (d < bestD) {
                bestD = d
                best = i
              }
            }
            const next = [...pts.slice(0, best + 1), q, ...pts.slice(best + 1)]
            onChange(next)
            onSelect(best + 1)
          }}
        />
        {pts.map((p, i) => (
          // biome-ignore lint/a11y/noStaticElementInteractions: the table of points below does the same from the keyboard
          <circle
            // biome-ignore lint/suspicious/noArrayIndexKey: points in order
            key={i}
            cx={p.x}
            cy={p.y}
            r={r}
            fill={selected === i ? 'var(--sew-mark)' : p.smooth ? 'var(--sew-paper)' : 'var(--sew-ink)'}
            stroke="var(--sew-ink)"
            strokeWidth={r / 3}
            style={{ cursor: 'grab' }}
            onPointerDown={(ev) => {
              ;(ev.target as Element).setPointerCapture?.(ev.pointerId)
              drag.current = i
              onSelect(i)
            }}
            onDoubleClick={() => onChange(pts.map((q, j) => (j === i ? { ...q, smooth: !q.smooth } : q)))}
          />
        ))}
      </svg>
      <Box sx={{ maxHeight: 220, overflow: 'auto' }}>
        <Box
          component="table"
          sx={{ borderCollapse: 'collapse', width: '100%', '& td': { pt: 1.25, pb: 0.25, pr: 1 } }}
          aria-label="Points"
        >
          <tbody>
            {pts.map((p, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: points in order
              <tr key={i} style={{ background: selected === i ? 'var(--wp-hover)' : undefined }}>
                <td style={{ width: 28, fontSize: 13 }}>{i + 1}</td>
                <td>
                  <NumberField
                    label={`Across (${u})`}
                    value={len(p.x)}
                    min={len(-500)}
                    max={len(500)}
                    step={units === 'cm' ? 0.5 : 0.125}
                    onChange={(v) => onChange(pts.map((q, j) => (j === i ? { ...q, x: fromUnits(v, units) } : q)))}
                  />
                </td>
                <td>
                  <NumberField
                    label={`Down (${u})`}
                    value={len(p.y)}
                    min={len(-500)}
                    max={len(500)}
                    step={units === 'cm' ? 0.5 : 0.125}
                    onChange={(v) => onChange(pts.map((q, j) => (j === i ? { ...q, y: fromUnits(v, units) } : q)))}
                  />
                </td>
                <td>
                  <FormControlLabel
                    control={
                      <Checkbox
                        size="small"
                        checked={Boolean(p.smooth)}
                        onChange={(x) =>
                          onChange(pts.map((q, j) => (j === i ? { ...q, smooth: x.target.checked } : q)))
                        }
                      />
                    }
                    label="Smooth"
                  />
                </td>
                <td>
                  <Tooltip title="Remove this point">
                    <span>
                      <IconButton
                        aria-label={`Remove point ${i + 1}`}
                        disabled={pts.length <= 3}
                        onClick={() => onChange(pts.filter((_, j) => j !== i))}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </span>
                  </Tooltip>
                </td>
              </tr>
            ))}
          </tbody>
        </Box>
      </Box>
      <Button
        size="small"
        variant="outlined"
        color="inherit"
        startIcon={<AddIcon />}
        sx={{ alignSelf: 'flex-start' }}
        onClick={() => {
          const last = pts[pts.length - 1]
          const first = pts[0]
          onChange([...pts, { x: (last.x + first.x) / 2, y: (last.y + first.y) / 2 + 2 }])
        }}
      >
        Add a point
      </Button>
    </Stack>
  )
}
