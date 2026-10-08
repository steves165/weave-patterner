import { Button, Paper, Stack, Typography } from '@mui/material'

interface Props {
  onChoose: (allow: boolean) => void
}

/** Asks once whether Weave Patterner may use Google Analytics. Nothing is loaded until the visitor says yes. */
export function ConsentBanner({ onChoose }: Props) {
  return (
    <Paper
      role="region"
      aria-label="Analytics"
      data-testid="analytics-consent"
      elevation={6}
      sx={{
        position: 'fixed',
        zIndex: 1300,
        left: { xs: 8, sm: 16 },
        bottom: 'calc(16px + env(safe-area-inset-bottom, 0px))',
        maxWidth: { xs: 'calc(100vw - 16px)', sm: 440 },
        p: 2,
      }}
    >
      <Typography variant="subtitle2">Help improve Weave Patterner?</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
        With your OK, Google Analytics counts visits and which tools get used, using cookies. It never sees your
        patterns, and there are no ads.
      </Typography>
      <Stack direction="row" sx={{ gap: 1, mt: 1.5, justifyContent: 'flex-end' }}>
        <Button onClick={() => onChoose(false)}>No thanks</Button>
        <Button variant="contained" onClick={() => onChoose(true)}>
          Allow
        </Button>
      </Stack>
    </Paper>
  )
}
