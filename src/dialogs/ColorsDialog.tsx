import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/Delete'
import {
  Alert,
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Tab,
  Tabs,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material'
import { useEffect, useMemo, useState } from 'react'
import { applyStripes, type ColorRun, darkAndLight, expandRuns, PRESETS, toRuns } from '../colors'
import { PatternThumb } from '../components/PatternThumb'
import { useSavedPresets } from '../hooks/useSavedPresets'
import { usePhone } from '../layout'
import { themeColours } from '../seasons'
import type { Draft } from '../weave'

interface Props {
  open: boolean
  draft: Draft
  onClose: () => void
  /** Called with the changed draft and a short description of what was done. */
  onApply: (draft: Draft, message: string) => void
}

type Side = 'warp' | 'weft'

/** A stripe to start from, in the theme's warp and weft colours. */
const defaultRuns = (): ColorRun[] => {
  const { warp, weft } = themeColours()
  return [
    { color: warp, count: 4 },
    { color: weft, count: 4 },
  ]
}

/** The presets' starting colours: the theme's warp and weft (the darker as dark), and its accent. */
function presetColours() {
  const { warp, weft, accent } = themeColours()
  const [dark, light] = darkAndLight(warp, weft)
  return { dark, light, accent }
}

/** Stripe sequences for the warp or weft, and colour-and-weave presets. */
export function ColorsDialog({ open, draft, onClose, onApply }: Props) {
  const phone = usePhone()
  const [tab, setTab] = useState(0)
  const [side, setSide] = useState<Side>('warp')
  const [runs, setRuns] = useState<ColorRun[]>(defaultRuns)
  const [from, setFrom] = useState('1')
  const [to, setTo] = useState('')
  const [{ dark, light, accent }, setColours] = useState(presetColours)
  const setDark = (dark: string) => setColours((c) => ({ ...c, dark }))
  const setLight = (light: string) => setColours((c) => ({ ...c, light }))
  const setAccent = (accent: string) => setColours((c) => ({ ...c, accent }))
  // Each preset in the chosen colours, for its preview and to use.
  const built = useMemo(
    () => PRESETS.map((preset) => ({ preset, draft: preset.build(dark, light, accent) })),
    [dark, light, accent],
  )
  const saved = useSavedPresets(open && tab === 1)
  const [error, setError] = useState<string | null>(null)
  const colors = side === 'warp' ? draft.warpColors : draft.weftColors

  // Start from the current colours (if they form a manageable stripe) each time the dialog or side changes.
  useEffect(() => {
    if (!open) return
    const current = toRuns(side === 'warp' ? draft.warpColors : draft.weftColors)
    setRuns(current.length >= 2 && current.length <= 8 ? current : defaultRuns())
    setFrom('1')
    setTo(String(side === 'warp' ? draft.ends : draft.picks))
    setError(null)
  }, [open, side, draft.warpColors, draft.weftColors, draft.ends, draft.picks])

  const setRun = (i: number, patch: Partial<ColorRun>) =>
    setRuns(runs.map((r, j) => (j === i ? { ...r, ...patch } : r)))
  const preview = (() => {
    try {
      return expandRuns(runs)
    } catch {
      return []
    }
  })()

  const applyStripe = () => {
    try {
      const next = applyStripes(colors, runs, Number(from), Number(to))
      const label = side === 'warp' ? 'ends' : 'picks'
      onApply(
        side === 'warp' ? { ...draft, warpColors: next } : { ...draft, weftColors: next },
        `Applied a ${preview.length}-thread stripe to ${side} ${label} ${from}–${to}`,
      )
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  return (
    <Dialog open={open} onClose={onClose} fullScreen={phone} fullWidth maxWidth="sm">
      <DialogTitle>Colours</DialogTitle>
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ px: 3 }}>
        <Tab label="Stripes" />
        <Tab label="Colour-and-weave presets" />
      </Tabs>
      <DialogContent>
        {tab === 0 ? (
          <Stack sx={{ gap: 2, pt: 1 }}>
            <ToggleButtonGroup
              exclusive
              size="small"
              value={side}
              onChange={(_, v) => v && setSide(v)}
              aria-label="Apply to"
            >
              <ToggleButton value="warp">Warp (ends)</ToggleButton>
              <ToggleButton value="weft">Weft (picks)</ToggleButton>
            </ToggleButtonGroup>
            <Stack sx={{ gap: 1 }} role="list" aria-label="Stripe sequence">
              {runs.map((r, i) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: stripes are positional and edited in place
                <Stack key={i} direction="row" sx={{ gap: 1, alignItems: 'center' }} role="listitem">
                  <input
                    type="color"
                    className="picker"
                    aria-label={`Stripe ${i + 1} colour`}
                    value={r.color}
                    onChange={(e) => setRun(i, { color: e.target.value })}
                  />
                  <TextField
                    size="small"
                    type="number"
                    label={`Stripe ${i + 1} threads`}
                    value={r.count}
                    onChange={(e) => setRun(i, { count: Number(e.target.value) })}
                    slotProps={{ htmlInput: { min: 1 } }}
                    sx={{ width: 150 }}
                  />
                  <IconButton
                    aria-label={`Remove stripe ${i + 1}`}
                    disabled={runs.length <= 1}
                    onClick={() => setRuns(runs.filter((_, j) => j !== i))}
                  >
                    <DeleteIcon />
                  </IconButton>
                </Stack>
              ))}
            </Stack>
            <Button
              startIcon={<AddIcon />}
              sx={{ alignSelf: 'flex-start' }}
              onClick={() => setRuns([...runs, { color: runs[runs.length - 1]?.color ?? '#000000', count: 1 }])}
            >
              Add stripe
            </Button>
            <Box
              data-testid="stripe-preview"
              role="img"
              aria-label="Preview of the stripes"
              sx={{ display: 'flex', height: 20, border: 1, borderColor: 'divider', overflow: 'hidden' }}
            >
              {Array.from({ length: Math.min(64, Math.max(preview.length, 1) * 4) }, (_, i) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: purely positional preview
                <Box key={i} sx={{ flex: 1, bgcolor: preview[i % preview.length] ?? 'transparent' }} />
              ))}
            </Box>
            <Stack direction="row" sx={{ gap: 1, alignItems: 'center' }}>
              <TextField
                size="small"
                type="number"
                label="From"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                sx={{ width: 96 }}
              />
              <TextField
                size="small"
                type="number"
                label="To"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                sx={{ width: 96 }}
              />
              <Typography variant="body2" color="text.secondary">
                of {colors.length} {side === 'warp' ? 'ends' : 'picks'}
              </Typography>
            </Stack>
            {error && <Alert severity="error">{error}</Alert>}
            <Button variant="contained" sx={{ alignSelf: 'flex-start' }} onClick={applyStripe}>
              Apply stripe to {side}
            </Button>
          </Stack>
        ) : (
          <Stack sx={{ gap: 2, pt: 1 }}>
            <Stack direction="row" sx={{ gap: 2, alignItems: 'center' }}>
              <Stack direction="row" sx={{ gap: 1, alignItems: 'center' }}>
                <input
                  type="color"
                  className="picker"
                  aria-label="Dark colour"
                  value={dark}
                  onChange={(e) => setDark(e.target.value)}
                />
                <Typography>Dark</Typography>
              </Stack>
              <Stack direction="row" sx={{ gap: 1, alignItems: 'center' }}>
                <input
                  type="color"
                  className="picker"
                  aria-label="Light colour"
                  value={light}
                  onChange={(e) => setLight(e.target.value)}
                />
                <Typography>Light</Typography>
              </Stack>
              <Stack direction="row" sx={{ gap: 1, alignItems: 'center' }}>
                <input
                  type="color"
                  className="picker"
                  aria-label="Accent colour"
                  value={accent}
                  onChange={(e) => setAccent(e.target.value)}
                />
                <Typography>Accent</Typography>
              </Stack>
            </Stack>
            <Typography variant="body2" color="text.secondary">
              They start in the theme's colours. A preset replaces the whole draft (undo brings it back); some use the
              accent too.
            </Typography>
            {saved.length > 0 && (
              <>
                <Typography variant="subtitle2" component="h3">
                  Your presets
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: -1.5 }}>
                  Saved patterns starred as presets under Load, in their own colours.
                </Typography>
                {saved.map((p) => (
                  <Card key={`saved-${p.name}`} variant="outlined" data-saved-preset={p.name}>
                    <Stack direction="row" sx={{ gap: 2, alignItems: 'center', p: 1.5 }}>
                      <PatternThumb draft={p.draft} size={64} />
                      <CardContent sx={{ p: 0, flex: 1, minWidth: 0, '&:last-child': { pb: 0 } }}>
                        <Typography variant="subtitle1" component="h4">
                          {p.name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {p.draft.shafts} shafts · {p.draft.treadles} treadles · {p.draft.ends} × {p.draft.picks}
                        </Typography>
                      </CardContent>
                      <CardActions sx={{ p: 0 }}>
                        <Button
                          aria-label={`Use ${p.name}`}
                          onClick={() => onApply(p.draft, `Applied your ${p.name} preset`)}
                        >
                          Use
                        </Button>
                      </CardActions>
                    </Stack>
                  </Card>
                ))}
                <Typography variant="subtitle2" component="h3">
                  Built-in presets
                </Typography>
              </>
            )}
            {built.map(({ preset: p, draft: d }) => (
              <Card key={p.id} variant="outlined">
                <Stack direction="row" sx={{ gap: 2, alignItems: 'center', p: 1.5 }}>
                  <PatternThumb draft={d} size={64} />
                  <CardContent sx={{ p: 0, flex: 1, minWidth: 0, '&:last-child': { pb: 0 } }}>
                    <Typography variant="subtitle1" component="h3">
                      {p.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {p.description}
                    </Typography>
                  </CardContent>
                  <CardActions sx={{ p: 0 }}>
                    <Button aria-label={`Use ${p.name}`} onClick={() => onApply(d, `Applied the ${p.name} preset`)}>
                      Use
                    </Button>
                  </CardActions>
                </Stack>
              </Card>
            ))}
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  )
}
