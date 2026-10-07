import GitHubIcon from '@mui/icons-material/GitHub'
import { Paper } from '@mui/material'

/** "Made by steves165" badge in the bottom-right corner, linking to the repo. */
export function Footer() {
  return (
    <Paper
      component="a"
      href="https://github.com/steves165/weave-patterner"
      target="_blank"
      rel="noopener noreferrer"
      elevation={3}
      sx={{
        position: 'fixed',
        right: { xs: 8, sm: 16 },
        bottom: { xs: 8, sm: 16 },
        px: { xs: 1, sm: 1.5 },
        py: { xs: 0.5, sm: 0.75 },
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        borderRadius: 5,
        textDecoration: 'none',
        color: 'text.secondary',
        fontSize: { xs: '0.7rem', sm: '0.8rem' },
        zIndex: 10,
        '&:hover': { color: 'text.primary' },
      }}
    >
      <GitHubIcon fontSize="small" />
      Made by steves165
    </Paper>
  )
}
