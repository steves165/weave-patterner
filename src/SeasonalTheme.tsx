import { MenuItem, TextField, ThemeProvider } from '@mui/material'
import { createContext, type ReactNode, useContext, useLayoutEffect, useMemo, useState } from 'react'
import {
  activeSeason,
  loadSeasonChoice,
  SEASONS,
  type SeasonChoice,
  saveSeasonChoice,
  seasonBrand,
  seasonCss,
} from './seasons'
import { type Brand, makeTheme } from './theme'

const Choice = createContext<{ choice: SeasonChoice; setChoice: (c: SeasonChoice) => void }>({
  choice: 'none',
  setChoice: () => {},
})

/**
 * The app's MUI theme, in its own colours or the seasonal theme chosen in View settings. The season's colours also
 * go on <html> (a class and a style sheet) for the parts drawn with App.css's variables, and into the browser's
 * theme colour.
 */
export function SeasonalTheme({ base, children }: { base: Brand; children: ReactNode }) {
  const [choice, setChoiceState] = useState<SeasonChoice>(loadSeasonChoice)
  const season = activeSeason(choice)
  const id = season?.id
  // biome-ignore lint/correctness/useExhaustiveDependencies: the season is fixed by its id
  const theme = useMemo(() => makeTheme(season ? seasonBrand(season) : base), [id, base])
  useLayoutEffect(() => {
    const root = document.documentElement
    for (const s of SEASONS) root.classList.toggle(`season-${s.id}`, s.id === id)
    let sheet = document.getElementById('wp-season') as HTMLStyleElement | null
    const found = SEASONS.find((s) => s.id === id)
    if (found) {
      if (!sheet) {
        sheet = document.createElement('style')
        sheet.id = 'wp-season'
        document.head.append(sheet)
      }
      sheet.textContent = seasonCss(found)
    } else sheet?.remove()
    const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
    if (meta) {
      meta.dataset.base ??= meta.content
      meta.content = found ? found.light.accent : meta.dataset.base
    }
  }, [id])
  const value = useMemo(
    () => ({
      choice,
      setChoice: (c: SeasonChoice) => {
        saveSeasonChoice(c)
        setChoiceState(c)
      },
    }),
    [choice],
  )
  return (
    <Choice.Provider value={value}>
      <ThemeProvider theme={theme} defaultMode="system">
        {children}
      </ThemeProvider>
    </Choice.Provider>
  )
}

/** The colour theme list for View settings: the app's own colours, holidays only, or a season. */
export function SeasonPicker({ app }: { app: string }) {
  const { choice, setChoice } = useContext(Choice)
  return (
    <TextField
      select
      size="small"
      label="Colour theme"
      value={SEASONS.some((s) => s.id === choice) || choice === 'holidays' ? choice : 'none'}
      onChange={(e) => setChoice(e.target.value)}
      helperText="Changes the app's colours, not your pattern's."
      slotProps={{ select: { MenuProps: { slotProps: { paper: { sx: { maxHeight: '60vh' } } } } } }}
      sx={{ minWidth: 0 }}
      fullWidth
    >
      <MenuItem value="none">{app} colours</MenuItem>
      <MenuItem value="holidays">Halloween and Christmas, when it's time</MenuItem>
      {SEASONS.map((s) => (
        <MenuItem key={s.id} value={s.id}>
          <span aria-hidden="true" style={{ marginRight: 8 }}>
            {s.emoji}
          </span>
          {s.name}
        </MenuItem>
      ))}
    </TextField>
  )
}
