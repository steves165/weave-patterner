import { Alert, Button, Paper, Stack, Typography } from '@mui/material'
import { useState } from 'react'
import { bringOver, describeMove, dismissMove, type MoveResult, moveOffered, takeMoveResult } from '../move'

/**
 * At the new address: offers once to bring over the patterns and settings saved at the old one, and afterwards says
 * what came over.
 */
export function MoveNotice({ app }: { app: string }) {
  const [done, setDone] = useState<MoveResult | null>(takeMoveResult)
  const [offer, setOffer] = useState(moveOffered)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (done)
    return (
      <Alert
        severity="success"
        role="status"
        onClose={() => setDone(null)}
        sx={{ position: 'fixed', zIndex: 1300, top: 72, left: '50%', transform: 'translateX(-50%)', maxWidth: 520 }}
      >
        {describeMove(done)}
      </Alert>
    )
  if (!offer) return null
  return (
    <Paper
      role="region"
      aria-label="Moved to a new address"
      elevation={6}
      sx={{
        position: 'fixed',
        zIndex: 1300,
        top: 72,
        left: '50%',
        transform: 'translateX(-50%)',
        width: 'min(480px, calc(100vw - 16px))',
        p: 2,
      }}
    >
      <Typography variant="subtitle2" component="h2">
        {app} has a new home
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
        It’s now at weave-patterner.com. If you saved patterns at the old address (steves165.github.io), bring them
        over, with your colours and settings. They go straight from your browser to here.
      </Typography>
      {error && (
        <Typography variant="body2" color="error" sx={{ mt: 1 }}>
          {error}
        </Typography>
      )}
      <Stack direction="row" sx={{ gap: 1, mt: 1.5, justifyContent: 'flex-end' }}>
        <Button
          onClick={() => {
            dismissMove()
            setOffer(false)
          }}
        >
          No thanks
        </Button>
        <Button
          variant="contained"
          disabled={busy}
          onClick={() => {
            setBusy(true)
            setError(null)
            bringOver().catch((e) => {
              setBusy(false)
              setError(e instanceof Error ? e.message : String(e))
            })
          }}
        >
          {busy ? 'Bringing them over…' : 'Bring them over'}
        </Button>
      </Stack>
    </Paper>
  )
}
