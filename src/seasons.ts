import type { Brand } from './theme'

/** One colour scheme of a seasonal theme: a few chosen colours; the rest are worked out from them. */
interface Scheme {
  accent: string
  /** Text and icons on the accent colour. */
  onAccent: string
  secondary: string
  bg: string
  panel: string
  paper: string
  ink: string
  muted: string
  /** Mixed into the background for lines, fields and hover colours (the accent, unless set). */
  tint?: string
  /** A filled box in the threading, tie-up and treadling. */
  on: string
}

export interface Season {
  id: string
  name: string
  /** Shown beside the name in the list. */
  emoji: string
  /** What it looks like, in a few words. */
  blurb: string
  /** The colours new patterns start in: warp and weft, and a new knitting chart's colours A and B. */
  pattern: { warp: string; weft: string; knit: [string, string] }
  light: Scheme
  dark: Scheme
}

/**
 * Seasonal themes, chosen in View settings: each replaces the app's own colours (pink for Weave, teal for Knit) in
 * light and dark mode. The pattern's colours are never changed.
 */
export const SEASONS: Season[] = [
  {
    id: 'halloween',
    blurb: 'Pumpkin orange on midnight purple',
    name: 'Halloween',
    emoji: '🎃',
    pattern: { warp: '#e8590c', weft: '#24132e', knit: ['#f28c28', '#24132e'] },
    light: {
      accent: '#C2410C',
      onAccent: '#FFFFFF',
      secondary: '#6B3FA0',
      bg: '#FFF3E6',
      panel: '#FFF9F2',
      paper: '#FFFDFA',
      ink: '#24140C',
      muted: '#7A4A2C',
      on: '#2B1638',
    },
    dark: {
      accent: '#FF8A3D',
      onAccent: '#241005',
      secondary: '#B48CE6',
      bg: '#110B17',
      panel: '#1A1222',
      paper: '#20162A',
      ink: '#F8ECE0',
      muted: '#C9AFC2',
      tint: '#8A5CC0',
      on: '#FFB074',
    },
  },
  {
    id: 'christmas',
    blurb: 'Holly red and pine green',
    name: 'Christmas',
    emoji: '🎄',
    pattern: { warp: '#b71c1c', weft: '#1b5e20', knit: ['#f5ebdd', '#b71c1c'] },
    light: {
      accent: '#B71C1C',
      onAccent: '#FFFFFF',
      secondary: '#1B5E20',
      bg: '#F4F8F2',
      panel: '#FAFCF8',
      paper: '#FFFFFF',
      ink: '#14231A',
      muted: '#4E6455',
      tint: '#2E7D32',
      on: '#14231A',
    },
    dark: {
      accent: '#F26B6B',
      onAccent: '#2B0606',
      secondary: '#8FD19A',
      bg: '#0B1710',
      panel: '#112118',
      paper: '#16281D',
      ink: '#F4EFE6',
      muted: '#B4C8B9',
      tint: '#4CAF50',
      on: '#FFB4B4',
    },
  },
  {
    id: 'winter',
    blurb: 'Icy blues',
    name: 'Winter',
    emoji: '❄️',
    pattern: { warp: '#1e4e8c', weft: '#e8f1fa', knit: ['#e8f1fa', '#1e4e8c'] },
    light: {
      accent: '#1565C0',
      onAccent: '#FFFFFF',
      secondary: '#455A75',
      bg: '#F1F6FC',
      panel: '#F8FBFE',
      paper: '#FFFFFF',
      ink: '#0F1D2C',
      muted: '#4A6178',
      on: '#0F1D2C',
    },
    dark: {
      accent: '#7DB8F5',
      onAccent: '#06182B',
      secondary: '#A9BFD6',
      bg: '#0A111C',
      panel: '#101A27',
      paper: '#15202F',
      ink: '#E8F1FB',
      muted: '#A2B8CE',
      on: '#BFDFFF',
    },
  },
  {
    id: 'spring',
    blurb: 'Lilac and fresh green',
    name: 'Spring',
    emoji: '🌸',
    pattern: { warp: '#7b3fb8', weft: '#e6f4d8', knit: ['#f3eafb', '#7b3fb8'] },
    light: {
      accent: '#7B3FB8',
      onAccent: '#FFFFFF',
      secondary: '#3F7A3A',
      bg: '#F7F3FC',
      panel: '#FBF9FE',
      paper: '#FFFEFF',
      ink: '#21162E',
      muted: '#66557A',
      on: '#21162E',
    },
    dark: {
      accent: '#C49BF0',
      onAccent: '#1E0B33',
      secondary: '#A5D69E',
      bg: '#130F1B',
      panel: '#1B1626',
      paper: '#211B2D',
      ink: '#F3ECFB',
      muted: '#BFB0D2',
      on: '#E2CCFF',
    },
  },
  {
    id: 'summer',
    blurb: 'Sunshine gold and sea blue',
    name: 'Summer',
    emoji: '☀️',
    pattern: { warp: '#f2a900', weft: '#0277bd', knit: ['#fff4cc', '#0277bd'] },
    light: {
      accent: '#9A5800',
      onAccent: '#FFFFFF',
      secondary: '#0277BD',
      bg: '#FFF9E3',
      panel: '#FFFCF0',
      paper: '#FFFEF9',
      ink: '#2A1F05',
      muted: '#735F2A',
      tint: '#E0A800',
      on: '#2A1F05',
    },
    dark: {
      accent: '#FFC94A',
      onAccent: '#2A1D00',
      secondary: '#7CC8F2',
      bg: '#14110A',
      panel: '#1D1910',
      paper: '#231E13',
      ink: '#FFF6DE',
      muted: '#D2C29A',
      on: '#FFE29A',
    },
  },
  {
    id: 'autumn',
    blurb: 'Russet and golden leaves',
    name: 'Autumn',
    emoji: '🍂',
    pattern: { warp: '#a0441a', weft: '#e9c46a', knit: ['#e9c46a', '#7a2e10'] },
    light: {
      accent: '#A0441A',
      onAccent: '#FFFFFF',
      secondary: '#5F6B1F',
      bg: '#FBF4EC',
      panel: '#FDF9F4',
      paper: '#FFFDFA',
      ink: '#2A170D',
      muted: '#75523A',
      on: '#2A170D',
    },
    dark: {
      accent: '#E8895A',
      onAccent: '#2A0E02',
      secondary: '#C3CC7A',
      bg: '#16100B',
      panel: '#1F1711',
      paper: '#261C15',
      ink: '#F8EDE3',
      muted: '#CDB4A0',
      on: '#FFC6A3',
    },
  },
]

/** Whether the dates of the year are Halloween (late October) or Christmas (December): for "Holidays only". */
export function holidayOn(date: Date): string | null {
  const m = date.getMonth()
  const d = date.getDate()
  if (m === 9 && d >= 17) return 'halloween'
  if (m === 10 && d === 1) return 'halloween'
  if (m === 11 && d <= 26) return 'christmas'
  return null
}

/** The choice of theme: the app's own, one of SEASONS by id, or "holidays" (Halloween and Christmas when it's time). */
export type SeasonChoice = 'none' | 'holidays' | string

const KEY = 'wp-season'

export function loadSeasonChoice(): SeasonChoice {
  try {
    return localStorage.getItem(KEY) ?? 'none'
  } catch {
    return 'none'
  }
}

export function saveSeasonChoice(choice: SeasonChoice) {
  try {
    if (choice === 'none') localStorage.removeItem(KEY)
    else localStorage.setItem(KEY, choice)
  } catch {
    // not remembered: the app's own colours next time
  }
}

/** The season showing for a choice on a date, if any. */
export function activeSeason(choice: SeasonChoice, date = new Date()): Season | null {
  const id = choice === 'holidays' ? holidayOn(date) : choice
  return SEASONS.find((s) => s.id === id) ?? null
}

/** The colours a new pattern starts in, for the theme chosen now: the season's, or the apps' own. */
export function patternColours(date = new Date()): Season['pattern'] | null {
  return activeSeason(loadSeasonChoice(), date)?.pattern ?? null
}

/** Mixes `amount` (0–1) of colour a into colour b. Both #rrggbb. */
export function mix(a: string, b: string, amount: number): string {
  const ch = (hex: string, i: number) => Number.parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16)
  return `#${[0, 1, 2]
    .map((i) =>
      Math.round(ch(a, i) * amount + ch(b, i) * (1 - amount))
        .toString(16)
        .padStart(2, '0'),
    )
    .join('')}`
}

const rgba = (hex: string, alpha: number) => {
  const n = Number.parseInt(hex.slice(1), 16)
  return `rgba(${n >> 16}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`
}

/** The --wp-* and --grid-* colours (App.css) for one scheme. */
export function seasonVars(s: Scheme, dark: boolean): Record<string, string> {
  const tint = s.tint ?? s.accent
  const line = mix(tint, s.bg, dark ? 0.22 : 0.18)
  return {
    '--wp-bg': s.bg,
    '--wp-panel': s.panel,
    '--wp-line': line,
    '--wp-hover': mix(tint, s.bg, dark ? 0.16 : 0.1),
    '--wp-seg': mix(tint, s.bg, dark ? 0.13 : 0.09),
    '--wp-field': mix(tint, s.bg, dark ? 0.35 : 0.3),
    '--wp-field-hover': mix(tint, s.bg, dark ? 0.55 : 0.55),
    '--wp-switch-off': mix(tint, s.bg, dark ? 0.3 : 0.3),
    '--wp-paper': s.paper,
    '--wp-ink': s.ink,
    '--wp-muted': s.muted,
    '--wp-body': mix(s.ink, s.muted, 0.5),
    '--wp-accent': s.accent,
    '--wp-shadow': dark ? 'rgba(0, 0, 0, 0.35)' : rgba(s.accent, 0.07),
    '--wp-shadow-soft': dark ? 'rgba(0, 0, 0, 0.25)' : rgba(s.accent, 0.05),
    '--wp-shadow-strong': dark ? 'rgba(0, 0, 0, 0.4)' : rgba(s.accent, 0.3),
    '--wp-accent-glow': rgba(s.accent, dark ? 0.3 : 0.35),
    '--grid-line': mix(tint, s.paper, dark ? 0.25 : 0.2),
    '--grid-heavy': mix(tint, s.paper, dark ? 0.5 : 0.5),
    '--grid-off': s.paper,
    '--grid-on': s.on,
    '--drawdown-line': mix(tint, s.paper, dark ? 0.25 : 0.2),
  }
}

/**
 * The CSS for a season: its colours on <html class="season-…">, in light and dark mode. `:root:root` outranks the
 * apps' own colours (`:root.knit.dark` and the like) whatever order the styles load in.
 */
export function seasonCss(season: Season): string {
  const block = (sel: string, vars: Record<string, string>) =>
    `${sel} {\n${Object.entries(vars)
      .map(([k, v]) => `  ${k}: ${v};`)
      .join('\n')}\n}`
  return [
    block(`:root:root.season-${season.id}`, seasonVars(season.light, false)),
    block(`:root:root.season-${season.id}.dark`, seasonVars(season.dark, true)),
  ].join('\n')
}

/** The MUI colours for a season (see makeTheme). */
export function seasonBrand(season: Season): Brand {
  const { light: l, dark: d } = season
  return {
    accent: { light: l.accent, dark: d.accent, onDark: d.onAccent },
    secondary: { light: l.secondary, dark: d.secondary },
    background: { light: l.bg, dark: d.bg },
    paper: { light: l.panel, dark: d.panel },
    text: { light: l.ink, dark: d.ink },
    muted: { light: l.muted, dark: d.muted },
    divider: { light: mix(l.tint ?? l.accent, l.bg, 0.18), dark: mix(d.tint ?? d.accent, d.bg, 0.22) },
  }
}
