import ClearAllIcon from '@mui/icons-material/ClearAll'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import NoteAddIcon from '@mui/icons-material/NoteAdd'
import RestartAltIcon from '@mui/icons-material/RestartAlt'
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Divider,
  FormControlLabel,
  Slider,
  Stack,
  Switch,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import { useEffect, useState } from 'react'
import { MAX_THREADS } from '../tools'
import type { Draft } from '../weave'

export const LIMITS = {
  shafts: [2, 16],
  treadles: [2, 16],
  ends: [4, MAX_THREADS],
  picks: [4, MAX_THREADS],
} as const
export type Dim = keyof typeof LIMITS
const DIM_LABEL: Record<Dim, string> = { shafts: 'Shafts', treadles: 'Treadles', ends: 'Ends', picks: 'Picks' }

export const CELL_MIN = 6
export const CELL_MAX = 24
export const CELL_DEFAULT = Math.round(CELL_MIN + 0.75 * (CELL_MAX - CELL_MIN))

/** Number input that only commits (clamped) on blur or Enter, so typing "16" doesn't clamp at "1". */
function CommitField(props: {
  label: string
  value: number
  min: number
  max: number
  onCommit: (n: number) => void
  width?: number
}) {
  const { label, value, min, max, onCommit, width = 96 } = props
  const [text, setText] = useState(String(value))
  useEffect(() => setText(String(value)), [value])
  const commit = () => {
    const n = Math.max(min, Math.min(max, Math.round(Number(text)) || min))
    setText(String(n))
    if (n !== value) onCommit(n)
  }
  return (
    <TextField
      label={label}
      type="number"
      size="small"
      value={text}
      onChange={(e) => setText(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => e.key === 'Enter' && commit()}
      slotProps={{ htmlInput: { min, max } }}
      sx={{ width }}
    />
  )
}

interface Props {
  draft: Draft
  name: string | null
  compact: boolean
  touch: boolean
  onResize: (dim: Dim, n: number) => void
  cellSize: number
  onCellSize: (n: number) => void
  onFillWarp: (color: string) => void
  onFillWeft: (color: string) => void
  /** Long-float highlighting. */
  floats: { warp: number; weft: number }
  highlightFloats: boolean
  onHighlightFloats: (on: boolean) => void
  floatLimit: number
  onFloatLimit: (n: number) => void
  onClear: () => void
  canReset: boolean
  onReset: () => void
  onNew: () => void
}

/** The fold-away settings above the draft. */
export function SettingsPanel(p: Props) {
  const [fillWarp, setFillWarp] = useState('#8b0a0a')
  const [fillWeft, setFillWeft] = useState('#ffffff')
  const { draft } = p
  const longest = Math.max(p.floats.warp, p.floats.weft)

  return (
    <Accordion variant="outlined" disableGutters defaultExpanded={!p.compact} sx={{ mb: { xs: 1, sm: 2 } }}>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Typography variant="subtitle2">
          Pattern settings
          <Typography component="span" variant="body2" color="text.secondary" sx={{ ml: 1 }}>
            {draft.shafts} shafts · {draft.treadles} treadles · {draft.ends} × {draft.picks}
          </Typography>
        </Typography>
      </AccordionSummary>
      <AccordionDetails>
        <Stack direction="row" useFlexGap sx={{ flexWrap: 'wrap', gap: 2, alignItems: 'center' }}>
          {(Object.keys(LIMITS) as Dim[]).map((dim) => (
            <CommitField
              key={dim}
              label={DIM_LABEL[dim]}
              value={draft[dim]}
              min={LIMITS[dim][0]}
              max={LIMITS[dim][1]}
              onCommit={(n) => p.onResize(dim, n)}
            />
          ))}
          <Box sx={{ width: 180, px: 1 }}>
            <Typography variant="caption" color="text.secondary" id="cell-size-label">
              Cell size
            </Typography>
            <Slider
              size="small"
              min={CELL_MIN}
              max={CELL_MAX}
              value={p.cellSize}
              valueLabelDisplay="auto"
              aria-labelledby="cell-size-label"
              onChange={(_, v) => p.onCellSize(v as number)}
            />
          </Box>
          <Divider orientation="vertical" flexItem />
          <Stack direction="row" sx={{ gap: 1, alignItems: 'center' }}>
            <input
              type="color"
              className="picker"
              aria-label="Warp colour for all ends"
              value={fillWarp}
              onChange={(e) => setFillWarp(e.target.value)}
            />
            <Button size="small" variant="outlined" onClick={() => p.onFillWarp(fillWarp)}>
              Set all warp
            </Button>
          </Stack>
          <Stack direction="row" sx={{ gap: 1, alignItems: 'center' }}>
            <input
              type="color"
              className="picker"
              aria-label="Weft colour for all picks"
              value={fillWeft}
              onChange={(e) => setFillWeft(e.target.value)}
            />
            <Button size="small" variant="outlined" onClick={() => p.onFillWeft(fillWeft)}>
              Set all weft
            </Button>
          </Stack>
          <Divider orientation="vertical" flexItem />
          <Stack direction="row" sx={{ gap: 1, alignItems: 'center' }}>
            <FormControlLabel
              control={<Switch checked={p.highlightFloats} onChange={(e) => p.onHighlightFloats(e.target.checked)} />}
              label="Highlight floats longer than"
            />
            <CommitField label="Threads" value={p.floatLimit} min={1} max={99} onCommit={p.onFloatLimit} width={80} />
          </Stack>
          <Typography
            variant="body2"
            color={longest > p.floatLimit ? 'warning.main' : 'text.secondary'}
            data-testid="float-stats"
          >
            Longest floats: warp {p.floats.warp}, weft {p.floats.weft}
          </Typography>
          <Divider orientation="vertical" flexItem />
          <Tooltip title="Empty the threading, tie-up and treadling" describeChild>
            <Button size="small" startIcon={<ClearAllIcon />} onClick={p.onClear}>
              Clear grids
            </Button>
          </Tooltip>
          <Tooltip
            title={
              p.name
                ? `Undo all changes since "${p.name}" was last saved or loaded`
                : 'Undo all changes since starting this pattern'
            }
            describeChild
          >
            <span>
              <Button size="small" startIcon={<RestartAltIcon />} disabled={!p.canReset} onClick={p.onReset}>
                Reset
              </Button>
            </span>
          </Tooltip>
          <Tooltip title="Start a new pattern from the default twill" describeChild>
            <Button size="small" startIcon={<NoteAddIcon />} onClick={p.onNew}>
              New
            </Button>
          </Tooltip>
        </Stack>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
          {p.touch
            ? 'Tap boxes on the threading (top), tie-up (top right) and treadling (right) to toggle them, and swipe to move around the pattern. Turn on the brush in the toolbar to paint by dragging. Tap a colour swatch to change that warp end or weft pick.'
            : 'Click or drag on the threading (top), tie-up (top right) and treadling (right); arrow keys and Space work too. Click a colour swatch to change that warp end or weft pick. Ctrl+Z undoes, Ctrl+Shift+Z redoes.'}
        </Typography>
      </AccordionDetails>
    </Accordion>
  )
}
