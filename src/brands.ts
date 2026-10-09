/**
 * An app's colours: its accent, the background and text, light and dark. The rest are CSS variables in App.css.
 * Kept apart from theme.ts (which builds MUI themes from them and loads the fonts) so the static pages can use them.
 */
export interface Brand {
  accent: { light: string; dark: string; onDark: string }
  secondary: { light: string; dark: string }
  background: { light: string; dark: string }
  paper: { light: string; dark: string }
  text: { light: string; dark: string }
  muted: { light: string; dark: string }
  divider: { light: string; dark: string }
}

/** Weave Patterner: magenta on blush pink; deep plum in dark mode. */
export const WEAVE: Brand = {
  accent: { light: '#D6246E', dark: '#E36A9C', onDark: '#2B0A1C' },
  secondary: { light: '#7A4462', dark: '#D3A9BF' },
  background: { light: '#FFF0F6', dark: '#170B13' },
  paper: { light: '#FFF8FB', dark: '#21111C' },
  text: { light: '#2B1622', dark: '#FCE8F1' },
  muted: { light: '#85506B', dark: '#C99BB3' },
  divider: { light: '#F6D2E1', dark: '#3A2131' },
}

/** Knit Patterner: the same design in teal on mint; deep green in dark mode. */
export const KNIT: Brand = {
  accent: { light: '#00796B', dark: '#4DB6AC', onDark: '#062A26' },
  secondary: { light: '#3F6B66', dark: '#A7CFC9' },
  background: { light: '#EEF8F6', dark: '#0B1716' },
  paper: { light: '#F7FCFB', dark: '#112120' },
  text: { light: '#14282A', dark: '#E6F5F2' },
  muted: { light: '#4E6F6B', dark: '#9CC3BC' },
  divider: { light: '#CFE9E4', dark: '#22403C' },
}
