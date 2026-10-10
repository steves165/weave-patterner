import BuildIcon from '@mui/icons-material/BuildOutlined'
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Paper,
  Stack,
  Typography,
} from '@mui/material'
import type { ReactNode } from 'react'
import type { Fix } from '../fixes'

/**
 * A problem from the status bar, opened: what it is, ways to fix it by hand, and fixes to apply in one step (each
 * saying what it changes; changes to the draft can be undone).
 */
export function FixDialog({
  open,
  title,
  explain,
  advice,
  fixes,
  onApply,
  onClose,
}: {
  open: boolean
  title: string
  explain: ReactNode
  /** Ways to fix it by hand, when no automatic fix fits every case. */
  advice?: string[]
  fixes: Fix[]
  onApply: (fix: Fix) => void
  onClose: () => void
}) {
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm" aria-labelledby="fix-title">
      <DialogTitle id="fix-title">{title}</DialogTitle>
      <DialogContent>
        <Typography variant="body2" sx={{ mb: 2 }} component="div">
          {explain}
        </Typography>
        {advice && advice.length > 0 && (
          <>
            <Typography component="h3" variant="subtitle2" sx={{ mb: 0.5 }}>
              To fix it by hand
            </Typography>
            <Box component="ul" sx={{ mt: 0, mb: 2, pl: 2.5, fontSize: 14 }}>
              {advice.map((a) => (
                <li key={a}>{a}</li>
              ))}
            </Box>
          </>
        )}
        <Typography component="h3" variant="subtitle2" sx={{ mb: 1 }}>
          {fixes.length ? 'Suggested fixes' : 'No automatic fix fits this draft'}
        </Typography>
        <Stack sx={{ gap: 1.25 }} data-testid="fixes">
          {fixes.map((f) => (
            <Paper
              key={f.id}
              variant="outlined"
              data-fix={f.id}
              sx={{
                p: 1.5,
                borderRadius: '14px',
                display: 'flex',
                gap: 1.5,
                alignItems: 'center',
                bgcolor: 'var(--wp-paper)',
              }}
            >
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Stack direction="row" sx={{ gap: 1, alignItems: 'center', flexWrap: 'wrap', mb: 0.25 }}>
                  <Typography sx={{ fontWeight: 700, fontSize: 15 }}>{f.title}</Typography>
                  <Chip
                    size="small"
                    label={f.resolves ? 'Fixes it' : 'Helps'}
                    color={f.resolves ? 'success' : 'default'}
                    variant="outlined"
                  />
                </Stack>
                <Typography variant="body2" color="text.secondary">
                  {f.detail}
                </Typography>
              </Box>
              <Button
                variant="contained"
                disableElevation
                size="small"
                startIcon={<BuildIcon />}
                onClick={() => onApply(f)}
                aria-label={`Apply: ${f.title}`}
                sx={{ flex: 'none' }}
              >
                Apply
              </Button>
            </Paper>
          ))}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  )
}
