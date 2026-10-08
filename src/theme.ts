import { createTheme } from '@mui/material'
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
export const ACCENT = { light: '#D6246E', dark: '#E36A9C' }
export const BODY_FONT = "'Nunito Variable', 'Nunito', 'Helvetica Neue', sans-serif"
export const DISPLAY_FONT = "'Fredoka', 'Nunito Variable', 'Nunito', sans-serif"
export const MONO_FONT = "'IBM Plex Mono', ui-monospace, monospace"

export const theme = createTheme({
  cssVariables: { colorSchemeSelector: 'class' },
  colorSchemes: {
    light: {
      palette: {
        primary: { main: ACCENT.light, contrastText: '#FFFFFF' },
        secondary: { main: '#7A4462' },
        background: { default: '#FFF0F6', paper: '#FFF8FB' },
        text: { primary: '#2B1622', secondary: '#85506B' },
        divider: '#F6D2E1',
        warning: { main: '#9A5B00' },
      },
    },
    dark: {
      palette: {
        primary: { main: ACCENT.dark, contrastText: '#2B0A1C' },
        secondary: { main: '#D3A9BF' },
        background: { default: '#170B13', paper: '#21111C' },
        text: { primary: '#FCE8F1', secondary: '#C99BB3' },
        divider: '#3A2131',
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
            boxShadow: '0 2px 6px rgba(214, 36, 110, 0.35)',
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
        thumb: { width: 16, height: 16, boxShadow: '0 1px 2px rgba(160, 30, 90, 0.3)' },
        track: { borderRadius: 10, opacity: 1, backgroundColor: 'var(--wp-switch-off)' },
      },
    },
  },
})
