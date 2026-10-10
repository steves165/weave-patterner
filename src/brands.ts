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

/** The three apps. */
export type AppId = 'weave' | 'knit' | 'sew'

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

/** Sew Patterner: the same design in indigo on lavender-grey; deep navy in dark mode. */
export const SEW: Brand = {
  accent: { light: '#3949AB', dark: '#9FA8DA', onDark: '#141A3D' },
  secondary: { light: '#4A5390', dark: '#B5BCE6' },
  background: { light: '#EEF0FB', dark: '#0D0F1E' },
  paper: { light: '#F8F9FE', dark: '#151829' },
  text: { light: '#181C33', dark: '#E8EAFA' },
  muted: { light: '#4D5580', dark: '#A3AAD6' },
  divider: { light: '#D6DAF2', dark: '#262B4A' },
}
