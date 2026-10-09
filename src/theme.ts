import { createTheme } from '@mui/material'
import { type Brand, WEAVE } from './brands'
import '@fontsource-variable/nunito/index.css'
import '@fontsource/fredoka/500.css'
import '@fontsource/fredoka/600.css'
import '@fontsource/ibm-plex-mono/400.css'
import '@fontsource/ibm-plex-mono/500.css'

/**
 * Weave Patterner's look: a magenta accent on blush pink (deep plum in dark mode), Nunito for text, Fredoka for the
 * name and headings, IBM Plex Mono for numbers. Pill-shaped buttons and segmented controls, rounded fields and cards.
 * The same colours are CSS variables (--wp-*) in App.css, for the grids and the parts outside MUI.
 */
export { type Brand, KNIT, WEAVE } from './brands'

export const ACCENT = { light: WEAVE.accent.light, dark: WEAVE.accent.dark }
export const BODY_FONT = "'Nunito Variable', 'Nunito', 'Helvetica Neue', sans-serif"
export const DISPLAY_FONT = "'Fredoka', 'Nunito Variable', 'Nunito', sans-serif"
export const MONO_FONT = "'IBM Plex Mono', ui-monospace, monospace"

/** The MUI theme for an app's colours. */
export const makeTheme = (b: Brand) =>
  createTheme({
    cssVariables: { colorSchemeSelector: 'class' },
    colorSchemes: {
      light: {
        palette: {
          primary: { main: b.accent.light, contrastText: '#FFFFFF' },
          secondary: { main: b.secondary.light },
          background: { default: b.background.light, paper: b.paper.light },
          text: { primary: b.text.light, secondary: b.muted.light },
          divider: b.divider.light,
          warning: { main: '#9A5B00' },
        },
      },
      dark: {
        palette: {
          primary: { main: b.accent.dark, contrastText: b.accent.onDark },
          secondary: { main: b.secondary.dark },
          background: { default: b.background.dark, paper: b.paper.dark },
          text: { primary: b.text.dark, secondary: b.muted.dark },
          divider: b.divider.dark,
          warning: { main: '#FFD27A' },
        },
      },
    },
    shape: { borderRadius: 14 },
    typography: {
      fontFamily: BODY_FONT,
      h1: { fontFamily: DISPLAY_FONT, fontWeight: 600 },
      h2: { fontFamily: DISPLAY_FONT, fontWeight: 600 },
      h3: { fontFamily: DISPLAY_FONT, fontWeight: 600 },
      h4: { fontFamily: DISPLAY_FONT, fontWeight: 600 },
      h5: { fontFamily: DISPLAY_FONT, fontWeight: 600 },
      h6: { fontFamily: DISPLAY_FONT, fontWeight: 600 },
      button: { textTransform: 'none', fontWeight: 600 },
    },
    components: {
      MuiAppBar: {
        defaultProps: { elevation: 0, color: 'inherit' },
        styleOverrides: {
          root: ({ theme }) => ({
            backgroundColor: theme.vars.palette.background.paper,
            color: theme.vars.palette.text.primary,
            borderBottom: `1px solid ${theme.vars.palette.divider}`,
          }),
        },
      },
      MuiButton: {
        styleOverrides: {
          root: { borderRadius: 999, paddingInline: 14 },
          outlined: { borderColor: 'var(--wp-field)', backgroundColor: 'var(--wp-paper)' },
          sizeSmall: { paddingInline: 12 },
        },
      },
      MuiIconButton: { styleOverrides: { root: { borderRadius: 999 } } },
      MuiToggleButtonGroup: {
        styleOverrides: {
          root: {
            backgroundColor: 'var(--wp-seg)',
            borderRadius: 999,
            padding: 3,
            gap: 2,
            flexWrap: 'wrap',
            '& .MuiToggleButtonGroup-grouped, & .MuiToggleButtonGroup-grouped:not(:first-of-type)': {
              border: 0,
              borderRadius: 999,
              margin: 0,
            },
          },
        },
      },
      MuiToggleButton: {
        styleOverrides: {
          root: ({ theme }) => ({
            textTransform: 'none',
            fontWeight: 600,
            color: theme.vars.palette.text.secondary,
            paddingInline: 14,
            '&.Mui-selected, &.Mui-selected:hover': {
              backgroundColor: theme.vars.palette.primary.main,
              color: theme.vars.palette.primary.contrastText,
              boxShadow: '0 2px 6px var(--wp-accent-glow)',
            },
          }),
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            borderRadius: 14,
            backgroundColor: 'var(--wp-paper)',
            '& .MuiOutlinedInput-notchedOutline': { borderWidth: 2, borderColor: 'var(--wp-field)' },
            '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--wp-field-hover)' },
          },
          input: { fontVariantNumeric: 'tabular-nums' },
        },
      },
      MuiPaper: {
        styleOverrides: {
          outlined: ({ theme }) => ({ borderColor: theme.vars.palette.divider }),
        },
      },
      MuiDialog: { styleOverrides: { paper: { borderRadius: 24 } } },
      MuiMenu: { styleOverrides: { paper: { borderRadius: 16 } } },
      MuiAlert: { styleOverrides: { root: { borderRadius: 16 } } },
      MuiSnackbarContent: { styleOverrides: { root: { borderRadius: 14 } } },
      // A small pill switch: 36 × 20 track, 16 px thumb.
      MuiSwitch: {
        styleOverrides: {
          root: { width: 52, height: 36, padding: 8 },
          switchBase: ({ theme }) => ({
            padding: 10,
            '&.Mui-checked': {
              transform: 'translateX(16px)',
              color: '#FFFFFF',
              '& + .MuiSwitch-track': { opacity: 1, backgroundColor: theme.vars.palette.primary.main },
            },
          }),
          thumb: { width: 16, height: 16, boxShadow: '0 1px 2px var(--wp-shadow-strong)' },
          track: { borderRadius: 10, opacity: 1, backgroundColor: 'var(--wp-switch-off)' },
        },
      },
    },
  })
