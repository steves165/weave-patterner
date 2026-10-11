import {
  Alert,
  Button,
  Card,
  CardActions,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Tab,
  Tabs,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material'
import { useEffect, useMemo, useState } from 'react'
import { applyStripes, type ColorRun, darkAndLight, expandRuns, PRESETS, toRuns, withStripe } from '../colors'
import { ColourInput } from '../components/ColourInput'
import { PatternThumb } from '../components/PatternThumb'
import { StripeEditor } from '../components/StripeEditor'
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
    // The stripe applied before, to change; or the colours as they are, if they make a manageable stripe.
    const remembered = draft.stripes?.[side]
    const current = toRuns(side === 'warp' ? draft.warpColors : draft.weftColors)
    setRuns(remembered ? remembered.runs : current.length >= 2 && current.length <= 8 ? current : defaultRuns())
    setFrom(String(remembered?.from ?? 1))
    setTo(String(remembered?.to ?? (side === 'warp' ? draft.ends : draft.picks)))
    setError(null)
  }, [open, side, draft.warpColors, draft.weftColors, draft.ends, draft.picks, draft.stripes])

  const preview = (() => {
    try {
      return expandRuns(runs)
    } catch {
      return []
    }
  })()

  const applyStripe = () => {
    try {
      applyStripes(colors, runs, Number(from), Number(to))
      const label = side === 'warp' ? 'ends' : 'picks'
      onApply(
        withStripe(draft, side, { runs, from: Number(from), to: Number(to) }),
        `Applied a ${preview.length}-thread stripe to ${side} ${label} ${from}–${to}: change it any time under Colours in the settings`,
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
            <StripeEditor runs={runs} onChange={(next) => setRuns(next)} />
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
                <ColourInput label="Dark colour" value={dark} onChange={setDark} />
                <Typography>Dark</Typography>
              </Stack>
              <Stack direction="row" sx={{ gap: 1, alignItems: 'center' }}>
                <ColourInput label="Light colour" value={light} onChange={setLight} />
                <Typography>Light</Typography>
              </Stack>
              <Stack direction="row" sx={{ gap: 1, alignItems: 'center' }}>
                <ColourInput label="Accent colour" value={accent} onChange={setAccent} />
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
