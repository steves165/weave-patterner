import DarkModeIcon from '@mui/icons-material/DarkMode'
import LightModeIcon from '@mui/icons-material/LightMode'
import SettingsBrightnessIcon from '@mui/icons-material/SettingsBrightness'
import { IconButton, Tooltip, useColorScheme } from '@mui/material'

const NEXT = { system: 'light', light: 'dark', dark: 'system' } as const
const LABEL = {
  system: 'System theme',
  light: 'Light theme',
  dark: 'Dark theme',
}
const ICON = {
  system: <SettingsBrightnessIcon />,
  light: <LightModeIcon />,
  dark: <DarkModeIcon />,
}

/** Cycles system → light → dark. MUI persists the choice in localStorage. */
export function ThemeToggle() {
  const { mode, setMode } = useColorScheme()
  const current = mode ?? 'system'
  return (
    <Tooltip title={`${LABEL[current]} (click to change)`}>
      <IconButton color="inherit" onClick={() => setMode(NEXT[current])} aria-label={LABEL[current]}>
        {ICON[current]}
      </IconButton>
    </Tooltip>
  )
}
