import DeleteIcon from '@mui/icons-material/Delete'
import SaveIcon from '@mui/icons-material/Save'
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import { useEffect, useRef, useState } from 'react'
import { usePhone } from '../layout'
import { blankChart, type KnitChart, widthOf } from './chart'
import { KnitThumb } from './KnitThumb'
import { insertPanel, panelLetter, removePanel, renamePanel, type SavedPanel, savePanel } from './panels'

interface Props {
  open: boolean
  chart: KnitChart
  /** Panel to start at (opened from its label above the chart). */
  focus: number | null
  store: SavedPanel[]
  onStore: (store: SavedPanel[]) => void
  /** Applies a change to the chart as one undo step; `merge` folds typing into the step before. */
  onChange: (next: KnitChart, merge?: boolean) => void
  onMessage: (message: string) => void
  onClose: () => void
}

/** A saved panel's squares as a small chart picture. */
const thumb = (p: SavedPanel) => ({ ...blankChart(1, 1), stitch: p.stitch, color: p.color, colors: p.colors })

/**
 * The chart's panels (A, B, C… across the chart), each named and written as a chart of its own, and the panel
 * store: panels saved to use again, here or in another chart, put in beside the others.
 */
export function PanelsDialog({ open, chart, focus, store, onStore, onChange, onMessage, onClose }: Props) {
  const phone = usePhone()
  const panels = chart.panels ?? []
  const w = widthOf(chart)
  const [place, setPlace] = useState('right')
  const [error, setError] = useState<string | null>(null)
  const focused = useRef<HTMLInputElement>(null)
  // Typing a name is one undo step.
  const typing = useRef(false)
  useEffect(() => {
    if (!open) return
    setError(null)
    typing.current = false
    if (focus !== null) setTimeout(() => focused.current?.focus(), 50)
  }, [open, focus])

  const at = () =>
    place === 'left'
      ? 0
      : place === 'right'
        ? w
        : place.startsWith('before:')
          ? (panels[Number(place.slice(7))]?.from ?? w)
          : (panels[Number(place.slice(6))]?.to ?? w - 1) + 1

  const save = (i: number) => {
    const name = panels[i].name.trim() || `Panel ${store.length + 1}`
    const saved = savePanel(chart, i, name)
    onStore([saved, ...store.filter((s) => s.name !== name)].slice(0, 100))
    if (name !== panels[i].name) onChange(renamePanel(chart, i, name))
    onMessage(`Saved "${name}" in the panel store`)
  }

  return (
    <Dialog open={open} onClose={onClose} fullScreen={phone} maxWidth="sm" fullWidth>
      <DialogTitle>Panels</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          A panel is a stretch of stitches worked as a chart of its own, such as a cable beside a lace edging. Select
          stitches and choose Make a panel. The written rows then say "work Panel A", and each panel is written out over
          its own rows. Save panels to put them into other charts.
        </Typography>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <Typography variant="subtitle2" component="h3" sx={{ mb: 1 }}>
          Panels in this chart
        </Typography>
        {panels.length === 0 && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            None yet.
          </Typography>
        )}
        <Stack sx={{ gap: 1.5, mb: 2.5 }}>
          {panels.map((p, i) => (
            <Stack
              key={`${p.from}-${p.to}`}
              direction="row"
              sx={{ gap: 1, alignItems: 'center', flexWrap: 'wrap' }}
              data-panel={panelLetter(i)}
            >
              <Typography sx={{ fontWeight: 700, width: 24 }}>{panelLetter(i)}</Typography>
              <TextField
                size="small"
                label={`Name of panel ${panelLetter(i)}`}
                value={p.name}
                inputRef={i === focus ? focused : undefined}
                onChange={(e) => {
                  onChange(renamePanel(chart, i, e.target.value), typing.current)
                  typing.current = true
                }}
                onBlur={() => {
                  typing.current = false
                }}
                slotProps={{ htmlInput: { maxLength: 60 } }}
                sx={{ flex: 1, minWidth: 160 }}
              />
              <Typography variant="body2" color="text.secondary" sx={{ minWidth: 100 }}>
                Stitches {w - p.to}–{w - p.from}
              </Typography>
              <Button size="small" startIcon={<SaveIcon />} onClick={() => save(i)}>
                {store.some((s) => s.name === p.name) ? 'Update in store' : 'Save to store'}
              </Button>
              <Tooltip title="Stop treating these stitches as a panel (they stay as they are)" describeChild>
                <IconButton
                  aria-label={`Remove panel ${panelLetter(i)}`}
                  onClick={() => onChange(removePanel(chart, i))}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Stack>
          ))}
        </Stack>
        <Divider sx={{ mb: 2 }} />
        <Stack direction="row" sx={{ gap: 2, alignItems: 'center', flexWrap: 'wrap', mb: 1.5 }}>
          <Typography variant="subtitle2" component="h3">
            Panel store
          </Typography>
          {store.length > 0 && (
            <TextField
              select
              size="small"
              label="Put saved panels in"
              value={place}
              onChange={(e) => setPlace(e.target.value)}
              sx={{ minWidth: 220 }}
            >
              <MenuItem value="right">At the right edge (before stitch 1)</MenuItem>
              <MenuItem value="left">At the left edge</MenuItem>
              {panels.flatMap((p, i) => [
                <MenuItem key={`a${p.from}`} value={`after:${i}`}>
                  To the right of panel {panelLetter(i)}
                </MenuItem>,
                <MenuItem key={`b${p.from}`} value={`before:${i}`}>
                  To the left of panel {panelLetter(i)}
                </MenuItem>,
              ])}
            </TextField>
          )}
        </Stack>
        {store.length === 0 && (
          <Typography variant="body2" color="text.secondary">
            Nothing saved yet. Use "Save to store" on a panel to keep it here.
          </Typography>
        )}
        <Stack sx={{ gap: 1 }} data-testid="panel-store">
          {store.map((p) => (
            <Stack key={p.name} direction="row" sx={{ gap: 1.5, alignItems: 'center' }} data-saved={p.name}>
              <KnitThumb chart={thumb(p)} size={44} />
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>
                  {p.name}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {p.stitch[0].length} stitches × {p.stitch.length} rows
                </Typography>
              </Box>
              <Button
                size="small"
                variant="outlined"
                color="inherit"
                aria-label={`Put in ${p.name}`}
                onClick={() => {
                  setError(null)
                  // Squares are stored left to right as drawn, so the right edge (where right-side rows start) is the end.
                  const next = insertPanel(chart, p, at())
                  if (next === chart) {
                    setError(`There isn't room for ${p.stitch[0].length} more stitches.`)
                    return
                  }
                  onChange(next)
                  onMessage(`Put in "${p.name}"`)
                }}
              >
                Put in
              </Button>
              <Tooltip title="Delete from the panel store" describeChild>
                <IconButton
                  aria-label={`Delete ${p.name} from the panel store`}
                  onClick={() => onStore(store.filter((s) => s.name !== p.name))}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Stack>
          ))}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Done</Button>
      </DialogActions>
    </Dialog>
  )
}
