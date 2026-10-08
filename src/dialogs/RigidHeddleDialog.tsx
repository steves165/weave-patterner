import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, Typography } from '@mui/material'
import { useMemo } from 'react'
import { usePhone } from '../layout'
import { findRepeat } from '../repeat'
import { RH_SHED_TEXT, type RhShed, rigidHeddlePlan } from '../rigidHeddle'
import type { Draft } from '../weave'

interface Props {
  open: boolean
  draft: Draft
  onClose: () => void
}

/** Lists numbers compactly: 2, 6, 10 … up to a limit. */
const list = (ns: number[], max = 20) =>
  ns.length > max ? `${ns.slice(0, max).join(', ')} and ${ns.length - max} more` : ns.join(', ')

/** Instructions for weaving the draft on a rigid-heddle loom with one pick-up stick, or why it can't be. */
export function RigidHeddleDialog({ open, draft, onClose }: Props) {
  const phone = usePhone()
  const result = useMemo(() => (open ? rigidHeddlePlan(draft) : null), [open, draft])
  // One repeat of the picks is enough to weave from.
  const repeat = useMemo(() => (open ? findRepeat(draft).picks : draft.picks), [open, draft])
  // Runs of the same shed and weft colour, so the instructions read "Picks 1–4: …".
  const runs = useMemo(() => {
    if (!result || !('plan' in result)) return []
    const out: { from: number; to: number; shed: RhShed | null; color: string }[] = []
    result.plan.sheds.slice(0, repeat).forEach((shed, p) => {
      const last = out[out.length - 1]
      if (last && last.to === p && last.shed === shed && last.color === draft.weftColors[p]) last.to = p + 1
      else out.push({ from: p + 1, to: p + 1, shed, color: draft.weftColors[p] })
    })
    return out
  }, [result, repeat, draft.weftColors])

  return (
    <Dialog open={open} onClose={onClose} fullScreen={phone} fullWidth maxWidth="sm">
      <DialogTitle>Rigid heddle</DialogTitle>
      <DialogContent>
        {result && 'reason' in result && (
          <Stack sx={{ gap: 2 }}>
            <Alert severity="info" data-testid="rh-reason">
              This draft can't be woven on a rigid heddle with one pick-up stick. {result.reason}
            </Alert>
            <Typography variant="body2" color="text.secondary">
              A rigid heddle can lift the hole ends, the slot ends, or (with a pick-up stick) a chosen set of slot ends,
              with or without the hole ends. Plain weave and pick-up patterns built on it translate; twills and most
              4-shaft structures don't.
            </Typography>
          </Stack>
        )}
        {result && 'plan' in result && (
          <Stack sx={{ gap: 2 }} data-testid="rh-plan">
            <Typography>
              <strong>Threading:</strong> end 1 in a {result.plan.firstEnd}, then alternate{' '}
              {result.plan.firstEnd === 'hole' ? 'slot, hole' : 'hole, slot'} across the warp ({draft.ends} ends).
            </Typography>
            <Typography data-testid="rh-pickup">
              <strong>Pick-up stick:</strong>{' '}
              {result.plan.pickUp.length === 0
                ? 'not needed.'
                : `with the heddle down, pick up slot ends ${list(result.plan.pickUp)} behind the heddle.`}
            </Typography>
            <Box>
              <Typography sx={{ mb: 1 }}>
                <strong>Weaving:</strong>
              </Typography>
              <Stack sx={{ gap: 0.5 }} role="list" aria-label="Weaving steps">
                {runs.map((r) => (
                  <Stack key={r.from} direction="row" sx={{ gap: 1, alignItems: 'center' }} role="listitem">
                    <Box
                      aria-hidden
                      sx={{ width: 14, height: 14, border: 1, borderColor: 'divider', bgcolor: r.color, flexShrink: 0 }}
                    />
                    <Typography variant="body2">
                      {r.from === r.to ? `Pick ${r.from}` : `Picks ${r.from}–${r.to}`}:{' '}
                      {r.shed ? RH_SHED_TEXT[r.shed] : 'no pick'}
                    </Typography>
                  </Stack>
                ))}
              </Stack>
              {repeat < draft.picks && (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Then repeat from pick 1 ({draft.picks} picks in all).
                </Typography>
              )}
            </Box>
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  )
}
