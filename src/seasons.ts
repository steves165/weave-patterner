import type { Brand } from './brands'

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
  /**
   * The colours new patterns start in: warp and weft, and a new knitting chart's colours A and B. The accent is a
   * third colour for presets that need one (gun club check, tattersall).
   */
  pattern: { warp: string; weft: string; accent: string; knit: [string, string] }
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
    pattern: { warp: '#e8590c', weft: '#24132e', accent: '#f4ead5', knit: ['#f28c28', '#24132e'] },
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
    pattern: { warp: '#b71c1c', weft: '#1b5e20', accent: '#d4a017', knit: ['#f5ebdd', '#b71c1c'] },
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
    pattern: { warp: '#1e4e8c', weft: '#e8f1fa', accent: '#9aa9b8', knit: ['#e8f1fa', '#1e4e8c'] },
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
    blurb: 'Daffodil yellow, new leaves and blossom pink',
    name: 'Spring',
    emoji: '🌷',
    pattern: { warp: '#4f8f2a', weft: '#fbe38e', accent: '#f4a7c0', knit: ['#fdf6c8', '#4f8f2a'] },
    light: {
      accent: '#3F7A1E',
      onAccent: '#FFFFFF',
      secondary: '#B03A6A',
      bg: '#FBFAE8',
      panel: '#FDFDF3',
      paper: '#FFFFFB',
      ink: '#18240E',
      muted: '#4F6136',
      tint: '#E8C21C',
      on: '#2C4A16',
    },
    dark: {
      accent: '#A8DB72',
      onAccent: '#132308',
      secondary: '#F5A8C6',
      bg: '#10150A',
      panel: '#171E10',
      paper: '#1C2414',
      ink: '#F3F8E6',
      muted: '#BCCBA2',
      tint: '#D9B630',
      on: '#FBE38E',
    },
  },
  {
    id: 'summer',
    blurb: 'Sea blue, warm sand and coral',
    name: 'Summer',
    emoji: '🏖️',
    pattern: { warp: '#0089c2', weft: '#fff1c2', accent: '#ff6f5e', knit: ['#fff1c2', '#0089c2'] },
    light: {
      accent: '#00699A',
      onAccent: '#FFFFFF',
      secondary: '#C2412F',
      bg: '#FFF8E8',
      panel: '#FFFBF1',
      paper: '#FFFEFA',
      ink: '#0B2230',
      muted: '#3F5F6E',
      tint: '#00A3C9',
      on: '#0B2230',
    },
    dark: {
      accent: '#5CCBF5',
      onAccent: '#03202E',
      secondary: '#FF9A8A',
      bg: '#071521',
      panel: '#0C1D2B',
      paper: '#112434',
      ink: '#EAF7FD',
      muted: '#A3C4D3',
      tint: '#1FA8D6',
      on: '#8FDDF8',
    },
  },
  {
    id: 'autumn',
    blurb: 'Russet and golden leaves',
    name: 'Autumn',
    emoji: '🍂',
    pattern: { warp: '#a0441a', weft: '#e9c46a', accent: '#4e2a14', knit: ['#e9c46a', '#7a2e10'] },
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
  {
    id: 'easter',
    blurb: 'Pastel eggs: lilac, mint and butter yellow',
    name: 'Easter',
    emoji: '🐣',
    pattern: { warp: '#b39ddb', weft: '#fff3b0', accent: '#a8dcc0', knit: ['#fff3b0', '#9575cd'] },
    light: {
      accent: '#6A45B0',
      onAccent: '#FFFFFF',
      secondary: '#2A7F62',
      bg: '#FCF9EC',
      panel: '#FDFBF4',
      paper: '#FFFFFC',
      ink: '#221A33',
      muted: '#5D5373',
      tint: '#B39DDB',
      on: '#3F2C6E',
    },
    dark: {
      accent: '#C7AEF5',
      onAccent: '#1D1235',
      secondary: '#93DDBE',
      bg: '#14111C',
      panel: '#1B1726',
      paper: '#211C2E',
      ink: '#F6F1FF',
      muted: '#C3B8D8',
      tint: '#9C84D6',
      on: '#FFE98A',
    },
  },
  {
    id: 'rachel',
    name: 'Rachel’s Theme <3',
    emoji: '💚',
    blurb: 'Every shade of green, with a little pink for love',
    pattern: { warp: '#2e7d32', weft: '#c8e6c9', accent: '#f48fb1', knit: ['#e8f5e9', '#2e7d32'] },
    light: {
      accent: '#2E7D32',
      onAccent: '#FFFFFF',
      secondary: '#A0446C',
      bg: '#F1F8EF',
      panel: '#F8FCF6',
      paper: '#FFFFFF',
      ink: '#11261A',
      muted: '#466250',
      on: '#11261A',
    },
    dark: {
      accent: '#7BD88F',
      onAccent: '#08240F',
      secondary: '#F0A8C8',
      bg: '#0A160E',
      panel: '#102016',
      paper: '#15281C',
      ink: '#ECF7EE',
      muted: '#A9C8B1',
      on: '#A8EBB5',
    },
  },
]

/**
 * The theme for the time of year, for "Seasonal": Easter from Palm Sunday to Easter Monday, Halloween from mid
 * October, Christmas through December to Boxing Day, and otherwise the season (spring from March, summer from June,
 * autumn from September, winter from December). Written to stand alone: the guide pages run a copy of it.
 */
export function seasonalOn(date: Date): string {
  const y = date.getFullYear()
  const m = date.getMonth()
  const d = date.getDate()
  // Easter Sunday (the anonymous Gregorian algorithm).
  const a = y % 19
  const b = Math.floor(y / 100)
  const c = y % 100
  const e = (19 * a + b - Math.floor(b / 4) - Math.floor((b - Math.floor((8 * b + 13) / 25)) / 3) + 15) % 30
  const f = (32 + 2 * (b % 4) + 2 * Math.floor(c / 4) - e - (c % 4)) % 7
  const g = Math.floor((a + 11 * e + 22 * f) / 451)
  const month = Math.floor((e + f - 7 * g + 114) / 31) - 1
  const day = ((e + f - 7 * g + 114) % 31) + 1
  const easter = new Date(y, month, day).getTime()
  const today = new Date(y, m, d).getTime()
  const days = Math.round((today - easter) / 86400000)
  if (days >= -7 && days <= 1) return 'easter'
  if ((m === 9 && d >= 17) || (m === 10 && d === 1)) return 'halloween'
  if (m === 11 && d <= 26) return 'christmas'
  if (m >= 2 && m <= 4) return 'spring'
  if (m >= 5 && m <= 7) return 'summer'
  if (m >= 8 && m <= 10) return 'autumn'
  return 'winter'
}

/**
 * The choice of theme: the app's own, one of SEASONS by id, or "seasonal" (whichever fits the date). "holidays", the
 * old Halloween-and-Christmas choice, now means "seasonal".
 */
export type SeasonChoice = 'none' | 'seasonal' | string

const KEY = 'wp-season'

export function loadSeasonChoice(): SeasonChoice {
  try {
    const choice = localStorage.getItem(KEY) ?? 'none'
    return choice === 'holidays' ? 'seasonal' : choice
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
  const id = choice === 'seasonal' || choice === 'holidays' ? seasonalOn(date) : choice
  return SEASONS.find((s) => s.id === id) ?? null
}

/** The colours a new pattern starts in, for the theme chosen now: the season's, or the apps' own. */
export function patternColours(date = new Date()): Season['pattern'] | null {
  return activeSeason(loadSeasonChoice(), date)?.pattern ?? null
}

/** Weave Patterner's own pattern colours: magenta warp, blush weft, deep plum accent. */
export const PINK_PATTERN = { warp: '#d6246e', weft: '#ffd3e4', accent: '#3b1730' }

/** The warp, weft and accent colours to start from, for the theme chosen now (pink when there's none). */
export function themeColours(date = new Date()): { warp: string; weft: string; accent: string } {
  return patternColours(date) ?? PINK_PATTERN
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
