import {
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { useEffect, useMemo, useState } from 'react'
import { usePhone } from '../layout'
import { colorTotals, windingPlan } from '../warping'
import type { Draft } from '../weave'
import { type Yarn, yarnFor } from '../yarns'

interface Props {
  open: boolean
  draft: Draft
  yarns: Yarn[]
  onClose: () => void
}

const Swatch = ({ color }: { color: string }) => (
  <Box
    aria-hidden
    sx={{ width: 18, height: 18, borderRadius: 0.5, border: 1, borderColor: 'divider', bgcolor: color, flexShrink: 0 }}
  />
)

/**
 * The warp winding plan: colour runs in end order, split into bouts, with tick boxes to keep your place at the
 * warping board, and the total ends of each colour.
 */
export function WarpPlanDialog({ open, draft, yarns, onClose }: Props) {
  const phone = usePhone()
  const [perBout, setPerBout] = useState('0')
  const [done, setDone] = useState<Set<string>>(new Set())
  const size = Math.max(0, Math.round(Number(perBout)) || 0)
  const plan = useMemo(() => windingPlan(draft, size), [draft, size])
  const totals = useMemo(() => colorTotals(draft.warpColors), [draft.warpColors])
  useEffect(() => {
    if (open) setDone(new Set())
  }, [open])
  const label = (color: string) => {
    const yarn = yarnFor(yarns, color)
    return yarn ? `${yarn.name} (${color})` : color
  }
  const toggle = (key: string) =>
    setDone((d) => {
      const next = new Set(d)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  const runs = plan.reduce((n, b) => n + b.runs.length, 0)

  return (
    <Dialog open={open} onClose={onClose} fullScreen={phone} fullWidth maxWidth="sm">
      <DialogTitle>Warp winding plan</DialogTitle>
      <DialogContent>
        <Stack sx={{ gap: 2, pt: 1 }}>
          <Typography variant="body2" color="text.secondary">
            Wind the warp in this order, from end 1. Tick each run off as you go.
          </Typography>
          <Stack direction="row" sx={{ gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
            <TextField
              size="small"
              type="number"
              label="Ends per bout"
              value={perBout}
              onChange={(e) => setPerBout(e.target.value)}
              helperText="0 winds it all as one"
              slotProps={{ htmlInput: { min: 0 } }}
              sx={{ width: 150 }}
            />
            <Typography variant="body2" data-testid="plan-progress">
              {done.size} of {runs} runs wound
            </Typography>
          </Stack>
          {plan.map((bout) => (
            <Box key={bout.number} component="section" aria-label={`Bout ${bout.number}`}>
              {plan.length > 1 && (
                <Typography variant="subtitle2" component="h3">
                  Bout {bout.number}: ends {bout.from}–{bout.to} ({bout.to - bout.from + 1} ends)
                </Typography>
              )}
              <Stack>
                {bout.runs.map((r) => {
                  const key = `${bout.number}-${r.from}`
                  return (
                    <FormControlLabel
                      key={key}
                      control={<Checkbox size="small" checked={done.has(key)} onChange={() => toggle(key)} />}
                      label={
                        <Stack direction="row" sx={{ gap: 1, alignItems: 'center' }}>
                          <Swatch color={r.color} />
                          <span>
                            Wind {r.count} {label(r.color)}
                            <Typography component="span" variant="body2" color="text.secondary">
                              {' '}
                              · ends {r.from === r.to ? r.from : `${r.from}–${r.to}`}
                            </Typography>
                          </span>
                        </Stack>
                      }
                      sx={{ textDecoration: done.has(key) ? 'line-through' : 'none' }}
                    />
                  )
                })}
              </Stack>
            </Box>
          ))}
          <Box>
            <Typography variant="subtitle2" component="h3">
              Totals
            </Typography>
            <Stack sx={{ gap: 0.5 }} data-testid="warp-totals">
              {totals.map((t) => (
                <Stack key={t.color} direction="row" sx={{ gap: 1, alignItems: 'center' }}>
                  <Swatch color={t.color} />
                  <Typography variant="body2">
                    {t.count} ends of {label(t.color)}
                  </Typography>
                </Stack>
              ))}
            </Stack>
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setDone(new Set())} disabled={done.size === 0}>
          Clear ticks
        </Button>
        <Button onClick={onClose}>Done</Button>
      </DialogActions>
    </Dialog>
  )
}
