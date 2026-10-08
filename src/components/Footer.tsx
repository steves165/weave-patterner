import GitHubIcon from '@mui/icons-material/GitHub'
import { Button, Paper, Stack } from '@mui/material'

interface Props {
  /** Shown when analytics is set up: lets visitors change their analytics choice. */
  onAnalytics?: () => void
}

const chip = {
  px: { xs: 1, sm: 1.5 },
  py: { xs: 0.5, sm: 0.75 },
  display: 'flex',
  alignItems: 'center',
  gap: 1,
  borderRadius: 5,
  textDecoration: 'none',
  color: 'text.secondary',
  fontSize: { xs: '0.7rem', sm: '0.8rem' },
  '&:hover': { color: 'text.primary' },
} as const

/** "Made by steves165" badge in the bottom-right corner, linking to the repo, and the analytics choice. */
export function Footer({ onAnalytics }: Props) {
  return (
    <Stack
      direction="row"
      sx={{ position: 'fixed', right: { xs: 8, sm: 16 }, bottom: { xs: 8, sm: 16 }, gap: 1, zIndex: 10 }}
    >
      {onAnalytics && (
        <Paper elevation={3} sx={{ borderRadius: 5 }}>
          <Button
            size="small"
            onClick={onAnalytics}
            sx={{ ...chip, textTransform: 'none', minWidth: 0, lineHeight: 1.5 }}
          >
            Analytics
          </Button>
        </Paper>
      )}
      <Paper
        component="a"
        href="https://github.com/steves165/weave-patterner"
        target="_blank"
        rel="noopener noreferrer"
        elevation={3}
        sx={chip}
      >
        <GitHubIcon fontSize="small" />
        Made by steves165
      </Paper>
    </Stack>
  )
}
