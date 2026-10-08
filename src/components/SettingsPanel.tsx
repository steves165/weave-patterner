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
import { type ReactNode, useEffect, useState } from 'react'
import type { ViewOptions } from '../hooks/useViewOptions'
import { MAX_THREADS } from '../tools'
import { CELL_MAX, CELL_MIN } from '../viewOptions'
import { type Draft, MAX_SHAFTS, MAX_TREADLES } from '../weave'

export const LIMITS = {
  shafts: [2, MAX_SHAFTS],
  treadles: [2, MAX_TREADLES],
  ends: [4, MAX_THREADS],
  picks: [4, MAX_THREADS],
} as const
export type Dim = keyof typeof LIMITS
const DIM_LABEL: Record<Dim, string> = { shafts: 'Shafts', treadles: 'Treadles', ends: 'Ends', picks: 'Picks' }

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
  /** Threads that never interlace (0-based). */
  unwoven: { ends: number[]; picks: number[] }
  highlightFloats: boolean
  onHighlightFloats: (on: boolean) => void
  floatLimit: number
  onFloatLimit: (n: number) => void
  view: ViewOptions
  onView: (patch: Partial<ViewOptions>) => void
  onClear: () => void
  canReset: boolean
  onReset: () => void
  onNew: () => void
}

/** On/off display options, in the order shown. */
type ViewSwitch = 'colorBoxes' | 'endOneRight' | 'numbers' | 'fabric' | 'sinkingShed' | 'threadingBelow'
const VIEW_SWITCHES: [ViewSwitch, string][] = [
  ['colorBoxes', 'Thread colours in boxes'],
  ['endOneRight', 'End 1 on the right'],
  ['numbers', 'Numbers in boxes'],
  ['fabric', 'Fabric view'],
  ['sinkingShed', 'Sinking shed'],
  ['threadingBelow', 'Threading below'],
]

/** "1, 5, 9 and 3 more" style list of 0-based thread indices, numbered from 1. */
const listThreads = (indices: number[], max = 6) =>
  indices.length > max
    ? `${indices
        .slice(0, max)
        .map((i) => i + 1)
        .join(', ')} and ${indices.length - max} more`
    : indices.map((i) => i + 1).join(', ')

/** A labelled row of settings; the label sits above the controls on narrow screens. */
function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Stack direction={{ xs: 'column', sm: 'row' }} sx={{ gap: { xs: 1, sm: 2 }, alignItems: { sm: 'center' } }}>
      <Typography variant="overline" color="text.secondary" sx={{ width: 80, flexShrink: 0, lineHeight: 1.5 }}>
        {title}
      </Typography>
      <Stack direction="row" useFlexGap sx={{ flexWrap: 'wrap', gap: 2, alignItems: 'center' }}>
        {children}
      </Stack>
    </Stack>
  )
}

/** The fold-away settings above the draft. */
export function SettingsPanel(p: Props) {
  const [fillWarp, setFillWarp] = useState('#8b0a0a')
  const [fillWeft, setFillWeft] = useState('#ffffff')
  const { draft } = p
  const longest = Math.max(p.floats.warp, p.floats.weft)

  return (
    <Accordion
      variant="outlined"
      disableGutters
      expanded={p.view.settingsOpen ?? !p.compact}
      onChange={(_, open) => p.onView({ settingsOpen: open })}
      sx={{ mb: { xs: 1, sm: 2 } }}
    >
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Typography variant="subtitle2">
          Pattern settings
          <Typography component="span" variant="body2" color="text.secondary" sx={{ ml: 1 }}>
            {draft.shafts} shafts · {draft.treadles} treadles · {draft.ends} × {draft.picks}
          </Typography>
        </Typography>
      </AccordionSummary>
      <AccordionDetails>
        <Stack sx={{ gap: 1.5 }} divider={<Divider flexItem />}>
          <Section title="Size">
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
          </Section>

          <Section title="Colours">
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
          </Section>

          <Section title="View">
            <Box sx={{ width: 170, px: 1 }}>
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
            <CommitField
              label="Ruler every"
              value={p.view.ruler}
              min={0}
              max={50}
              onCommit={(n) => p.onView({ ruler: n })}
              width={110}
            />
            {VIEW_SWITCHES.map(([key, label]) => (
              <FormControlLabel
                key={key}
                control={<Switch checked={p.view[key]} onChange={(e) => p.onView({ [key]: e.target.checked })} />}
                label={label}
              />
            ))}
          </Section>

          <Section title="Floats">
            <FormControlLabel
              control={<Switch checked={p.highlightFloats} onChange={(e) => p.onHighlightFloats(e.target.checked)} />}
              label="Highlight floats longer than"
            />
            <CommitField label="Threads" value={p.floatLimit} min={1} max={99} onCommit={p.onFloatLimit} width={80} />
            <Typography
              variant="body2"
              color={longest > p.floatLimit ? 'warning.main' : 'text.secondary'}
              data-testid="float-stats"
            >
              Longest floats: warp {p.floats.warp}, weft {p.floats.weft}
            </Typography>
            {(p.unwoven.ends.length > 0 || p.unwoven.picks.length > 0) && (
              <Typography variant="body2" color="warning.main" data-testid="unwoven">
                Not woven in:{' '}
                {[
                  p.unwoven.ends.length > 0 &&
                    `${p.unwoven.ends.length === 1 ? 'end' : 'ends'} ${listThreads(p.unwoven.ends)}`,
                  p.unwoven.picks.length > 0 &&
                    `${p.unwoven.picks.length === 1 ? 'pick' : 'picks'} ${listThreads(p.unwoven.picks)}`,
                ]
                  .filter(Boolean)
                  .join('; ')}{' '}
                (they never cross over and under)
              </Typography>
            )}
          </Section>

          <Section title="Pattern">
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
          </Section>
        </Stack>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
          {p.touch
            ? 'Tap boxes on the threading, tie-up and treadling to toggle them, and swipe to move around the pattern. Turn on the brush in the toolbar to paint by dragging. Tap a colour swatch to change that warp end or weft pick.'
            : 'Click or drag on the threading, tie-up and treadling; arrow keys and Space work too. Click a colour swatch to change that warp end or weft pick. Ctrl+Z undoes, Ctrl+Shift+Z redoes.'}
        </Typography>
      </AccordionDetails>
    </Accordion>
  )
}
