import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Radio,
  RadioGroup,
  Stack,
  ThemeProvider,
  Typography,
} from '@mui/material'
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
import { type Brand, makeTheme, WEAVE } from './theme'

const Choice = createContext<{ choice: SeasonChoice; setChoice: (c: SeasonChoice) => void; app: string; base: Brand }>({
  choice: 'none',
  setChoice: () => {},
  app: '',
  base: WEAVE,
})

/**
 * The app's MUI theme, in its own colours or the seasonal theme chosen in View settings. The season's colours also
 * go on <html> (a class and a style sheet) for the parts drawn with App.css's variables, and into the browser's
 * theme colour.
 */
export function SeasonalTheme({ app, base, children }: { app: string; base: Brand; children: ReactNode }) {
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
      app,
      base,
    }),
    [choice, app, base],
  )
  return (
    <Choice.Provider value={value}>
      <ThemeProvider theme={theme} defaultMode="system">
        {children}
      </ThemeProvider>
    </Choice.Provider>
  )
}

/** A row of colour dots: how a theme looks. */
function Swatches({ colors }: { colors: string[] }) {
  return (
    <Stack direction="row" aria-hidden="true" sx={{ gap: 0.5, flex: 'none' }}>
      {colors.map((c, i) => (
        <Box
          // biome-ignore lint/suspicious/noArrayIndexKey: a fixed list of colours
          key={i}
          sx={{ width: 18, height: 18, borderRadius: '50%', bgcolor: c, border: '1px solid rgba(0,0,0,0.15)' }}
        />
      ))}
    </Stack>
  )
}

/**
 * The colour theme dialog (from Theme at the foot of the page): the app's own colours, Halloween and Christmas
 * when it's time, or a season. It applies as soon as one is picked; new patterns start in its colours.
 */
export function ThemeDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { choice, setChoice, app, base } = useContext(Choice)
  const value = SEASONS.some((s) => s.id === choice) || choice === 'holidays' ? choice : 'none'
  const option = (id: string, label: ReactNode, hint: string, colors: string[]) => (
    <Box
      component="label"
      key={id}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        px: 1.5,
        py: 1,
        borderRadius: 3,
        border: 2,
        borderColor: value === id ? 'primary.main' : 'divider',
        cursor: 'pointer',
        '&:hover': { bgcolor: 'var(--wp-hover)' },
      }}
    >
      <Radio value={id} sx={{ p: 0.5 }} />
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography sx={{ fontWeight: 600 }}>{label}</Typography>
        <Typography variant="body2" color="text.secondary">
          {hint}
        </Typography>
      </Box>
      <Swatches colors={colors} />
    </Box>
  )
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs" aria-labelledby="theme-title">
      <DialogTitle id="theme-title">Colour theme</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Seasonal and other colour themes for {app}. New patterns start in the theme's colours; patterns you already
          have keep theirs.
        </Typography>
        <RadioGroup
          aria-labelledby="theme-title"
          value={value}
          onChange={(e) => setChoice(e.target.value)}
          sx={{ gap: 1 }}
        >
          {option('none', `${app} colours`, 'The usual look', [base.accent.light, base.background.light])}
          {option(
            'holidays',
            'Halloween and Christmas',
            'Only when it’s time: late October, and December',
            ['halloween', 'christmas'].map((id) => SEASONS.find((x) => x.id === id)?.light.accent ?? ''),
          )}
          {SEASONS.map((x) =>
            option(
              x.id,
              <>
                <span aria-hidden="true" style={{ marginRight: 6 }}>
                  {x.emoji}
                </span>
                {x.name}
              </>,
              x.blurb,
              [x.light.accent, x.dark.bg, x.pattern.warp, x.pattern.weft],
            ),
          )}
        </RadioGroup>
      </DialogContent>
      <DialogActions>
        <Button variant="contained" disableElevation onClick={onClose}>
          Done
        </Button>
      </DialogActions>
    </Dialog>
  )
}
