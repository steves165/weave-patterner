import ClearAllIcon from '@mui/icons-material/ClearAll'
import NoteAddIcon from '@mui/icons-material/NoteAdd'
import RestartAltIcon from '@mui/icons-material/RestartAlt'
import {
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
import { patternColours } from '../seasons'
import { MONO_FONT } from '../theme'
import { MAX_THREADS } from '../tools'
import { CELL_MAX, CELL_MIN } from '../viewOptions'
import { DEFAULT_WARP, DEFAULT_WEFT, type Draft, MAX_SHAFTS, MAX_TREADLES } from '../weave'

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
  width?: number | string
}) {
  const { label, value, min, max, onCommit, width = '100%' } = props
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
  touch: boolean
  onResize: (dim: Dim, n: number) => void
  cellSize: number
  onCellSize: (n: number) => void
  onFillWarp: (color: string) => void
  onFillWeft: (color: string) => void
  /** Opens the colour sequences and presets. */
  onColors: () => void
  /** The smallest repeat of the cloth. */
  repeat: { ends: number; picks: number }
  onTrimToRepeat: () => void
  highlightFloats: boolean
  onHighlightFloats: (on: boolean) => void
  /** The longest float in the draft, warp or weft, in threads. */
  longestFloat: number
  floatLimit: number
  onFloatLimit: (n: number) => void
  view: ViewOptions
  onView: (patch: Partial<ViewOptions>) => void
  onClear: () => void
  canReset: boolean
  onReset: () => void
  onNew: () => void
}

/** Two columns of fields, with room between the rows for the fields' floating labels. */
export const FIELD_GRID = {
  display: 'grid',
  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  columnGap: 1.5,
  rowGap: 2.25,
} as const

/** A switch's row: label at the left, switch flush with the right edge (its track has 8px of space around it). */
export const SWITCH_ROW = {
  mx: 0,
  minHeight: 44,
  justifyContent: 'space-between',
  gap: 1.5,
  '& .MuiSwitch-root': { mr: '-8px' },
} as const

/** On/off display options, in the order shown. */
type ViewSwitch = 'noTieup' | 'colorBoxes' | 'endOneRight' | 'numbers' | 'fabric' | 'sinkingShed' | 'threadingBelow'
const VIEW_SWITCHES: [ViewSwitch, string][] = [
  ['noTieup', 'No tie-up (lift plan)'],
  ['colorBoxes', 'Thread colours in boxes'],
  ['endOneRight', 'End 1 on the right'],
  ['numbers', 'Numbers in boxes'],
  ['fabric', 'Fabric view'],
  ['sinkingShed', 'Sinking shed'],
  ['threadingBelow', 'Threading below'],
]

/** A heading and its settings. */
function Section({ title, help, children }: { title: string; help: string; children: ReactNode }) {
  return (
    // Room above each outlined field for its floating label.
    <Stack component="section" sx={{ gap: 2 }} data-help={help}>
      <Typography variant="h2" sx={{ fontSize: 17, m: 0 }}>
        {title}
      </Typography>
      {children}
    </Stack>
  )
}

/** A switch with its label on the left, filling the row. */
function SwitchRow(props: { label: string; checked: boolean; onChange: (on: boolean) => void }) {
  return (
    <FormControlLabel
      labelPlacement="start"
      control={<Switch checked={props.checked} onChange={(e) => props.onChange(e.target.checked)} />}
      label={props.label}
      sx={SWITCH_ROW}
    />
  )
}

/** A colour swatch, its name and what it does, and a button to apply it. */
function ColorRow(props: {
  label: string
  hint: string
  aria: string
  button: string
  onApply: (c: string) => void
  initial: string
}) {
  const [color, setColor] = useState(props.initial)
  return (
    <Stack direction="row" sx={{ gap: 1.5, alignItems: 'center' }}>
      <input
        type="color"
        className="picker"
        aria-label={props.aria}
        value={color}
        onChange={(e) => setColor(e.target.value)}
      />
      <Box sx={{ flex: '1 1 auto', display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <Typography sx={{ fontWeight: 600 }}>{props.label}</Typography>
        <Typography variant="caption" color="text.secondary">
          {props.hint}
        </Typography>
      </Box>
      <Button size="small" variant="outlined" color="inherit" onClick={() => props.onApply(color)}>
        {props.button}
      </Button>
    </Stack>
  )
}

/** Pattern settings: the loom, colours, view, floats and the pattern itself, in the sidebar or the phone's sheet. */
export function SettingsPanel(p: Props) {
  const { draft } = p

  return (
    <Stack sx={{ gap: 2.5 }} divider={<Divider flexItem />}>
      <Section title="Loom" help="settings">
        <Box sx={FIELD_GRID}>
          {(Object.keys(LIMITS) as Dim[])
            // Without a tie-up there's a lift plan column per shaft, so no separate treadle count.
            .filter((dim) => !(dim === 'treadles' && p.view.noTieup))
            .map((dim) => (
              <CommitField
                key={dim}
                label={DIM_LABEL[dim]}
                value={draft[dim]}
                min={LIMITS[dim][0]}
                max={LIMITS[dim][1]}
                onCommit={(n) => p.onResize(dim, n)}
              />
            ))}
        </Box>
      </Section>

      <Section title="Colours" help="colours">
        <ColorRow
          label="Warp"
          hint="Sets every end"
          aria="Warp colour for all ends"
          button="Set all warp"
          initial={patternColours()?.warp ?? DEFAULT_WARP}
          onApply={p.onFillWarp}
        />
        <ColorRow
          label="Weft"
          hint="Sets every pick"
          aria="Weft colour for all picks"
          button="Set all weft"
          initial={patternColours()?.weft ?? DEFAULT_WEFT}
          onApply={p.onFillWeft}
        />
        <Button size="small" onClick={p.onColors} sx={{ alignSelf: 'flex-start', ml: -1.5 }}>
          Colours and presets…
        </Button>
      </Section>

      <Section title="View" help="settings">
        <Stack direction="row" sx={{ gap: 1.5, alignItems: 'center', minHeight: 40 }}>
          <Typography id="cell-size-label" sx={{ flex: 'none', width: 70, fontWeight: 500 }}>
            Cell size
          </Typography>
          <Slider
            size="small"
            min={CELL_MIN}
            max={CELL_MAX}
            value={p.cellSize}
            aria-labelledby="cell-size-label"
            onChange={(_, v) => p.onCellSize(v as number)}
            sx={{ flex: '1 1 auto' }}
          />
          <Typography
            sx={{ flex: 'none', width: 44, textAlign: 'right', fontFamily: MONO_FONT, fontSize: 13 }}
            color="text.secondary"
          >
            {p.cellSize} px
          </Typography>
        </Stack>
        <Box sx={FIELD_GRID}>
          <CommitField
            label="Ruler every"
            value={p.view.ruler}
            min={0}
            max={50}
            onCommit={(n) => p.onView({ ruler: n })}
          />
        </Box>
        <Stack>
          {VIEW_SWITCHES.map(([key, label]) => (
            <SwitchRow key={key} label={label} checked={p.view[key]} onChange={(on) => p.onView({ [key]: on })} />
          ))}
        </Stack>
      </Section>

      <Section title="Floats" help="checks">
        <SwitchRow label="Highlight floats longer than" checked={p.highlightFloats} onChange={p.onHighlightFloats} />
        <Box sx={FIELD_GRID}>
          <CommitField label="Threads" value={p.floatLimit} min={1} max={99} onCommit={p.onFloatLimit} />
        </Box>
        {p.highlightFloats && (
          <Typography variant="body2" color="text.secondary" role="status" data-testid="float-note" sx={{ mt: 1 }}>
            {p.longestFloat > p.floatLimit
              ? `Striped in the drawdown: floats up to ${p.longestFloat} threads long.`
              : `Nothing to mark: the longest float here is ${p.longestFloat} ${p.longestFloat === 1 ? 'thread' : 'threads'}.`}
          </Typography>
        )}
      </Section>

      <Section title="Pattern" help="settings">
        <Typography sx={{ color: 'var(--wp-body)' }} data-testid="repeat">
          Repeat: {p.repeat.ends} ends × {p.repeat.picks} picks
        </Typography>
        <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 1 }}>
          <Tooltip title="Cut the draft down to one repeat, ready to weave as many times as you like" describeChild>
            <span>
              <Button
                size="small"
                variant="outlined"
                color="inherit"
                disabled={p.repeat.ends === draft.ends && p.repeat.picks === draft.picks}
                onClick={p.onTrimToRepeat}
              >
                Trim to one repeat
              </Button>
            </span>
          </Tooltip>
          <Tooltip title="Empty the threading, tie-up and treadling" describeChild>
            <Button size="small" variant="outlined" color="inherit" startIcon={<ClearAllIcon />} onClick={p.onClear}>
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
              <Button
                size="small"
                variant="outlined"
                color="inherit"
                startIcon={<RestartAltIcon />}
                disabled={!p.canReset}
                onClick={p.onReset}
              >
                Reset
              </Button>
            </span>
          </Tooltip>
          <Tooltip title="Start a new pattern with empty grids" describeChild>
            <Button size="small" variant="outlined" color="inherit" startIcon={<NoteAddIcon />} onClick={p.onNew}>
              New
            </Button>
          </Tooltip>
        </Stack>
        <Typography variant="body2" color="text.secondary">
          {p.touch
            ? 'Tap boxes on the threading, tie-up and treadling to toggle them, and swipe to move around the pattern. Turn on the brush in the toolbar to paint by dragging. Tap a colour swatch to change that warp end or weft pick.'
            : 'Click or drag on the threading, tie-up and treadling; arrow keys and Space work too. Click a colour swatch to change that warp end or weft pick. Ctrl+Z undoes, Ctrl+Shift+Z redoes.'}
        </Typography>
      </Section>
    </Stack>
  )
}
