import { describe, expect, it, vi } from 'vitest'
import {
  activeSeason,
  loadSeasonChoice,
  mix,
  PINK_PATTERN,
  SEASONS,
  seasonalOn,
  seasonBrand,
  seasonCss,
  seasonVars,
  themeColours,
} from './seasons'

/** WCAG contrast ratio between two #rrggbb colours. */
function contrast(a: string, b: string) {
  const lum = (hex: string) => {
    const [r, g, bl] = [1, 3, 5].map((i) => {
      const c = Number.parseInt(hex.slice(i, i + 2), 16) / 255
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
    })
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl
  }
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

describe('seasonal themes', () => {
  it('include the seasons, Easter, Halloween and Christmas, with unique ids', () => {
    const ids = SEASONS.map((s) => s.id)
    expect(ids).toEqual(
      expect.arrayContaining(['halloween', 'christmas', 'easter', 'spring', 'summer', 'autumn', 'winter', 'rachel']),
    )
    expect(SEASONS.find((s) => s.id === 'rachel')?.name).toBe('Rachel’s Theme <3')
    expect(new Set(ids).size).toBe(ids.length)
  })

  for (const s of SEASONS)
    for (const mode of ['light', 'dark'] as const)
      it(`${s.name} (${mode}) has readable text and buttons`, () => {
        const c = s[mode]
        for (const bg of [c.bg, c.panel, c.paper]) {
          expect(contrast(c.ink, bg)).toBeGreaterThanOrEqual(7)
          expect(contrast(c.muted, bg)).toBeGreaterThanOrEqual(4.5)
          // The accent is used for links and the app's name.
          expect(contrast(c.accent, bg)).toBeGreaterThanOrEqual(4.5)
        }
        expect(contrast(c.onAccent, c.accent)).toBeGreaterThanOrEqual(4.5)
        // Filled boxes stand out from empty ones.
        expect(contrast(c.on, c.paper)).toBeGreaterThanOrEqual(3)
      })

  it('works out every colour App.css uses', () => {
    const vars = seasonVars(SEASONS[0].light, false)
    for (const name of ['--wp-bg', '--wp-line', '--wp-field', '--wp-accent', '--grid-on', '--grid-line'])
      expect(vars[name]).toMatch(/^#|^rgba/)
    const css = seasonCss(SEASONS[0])
    expect(css).toContain(':root:root.season-halloween {')
    expect(css).toContain(':root:root.season-halloween.dark {')
    expect(seasonBrand(SEASONS[0]).accent.light).toBe(SEASONS[0].light.accent)
  })

  it('give new patterns three colours, falling back to the pink', () => {
    for (const x of SEASONS) for (const c of Object.values(x.pattern).flat()) expect(c).toMatch(/^#[0-9a-f]{6}$/)
    expect(themeColours()).toEqual(PINK_PATTERN)
  })

  it('mixes colours', () => {
    expect(mix('#ffffff', '#000000', 0.5)).toBe('#808080')
    expect(mix('#ff0000', '#0000ff', 1)).toBe('#ff0000')
  })

  it('"Seasonal" follows the time of year, with Easter, Halloween and Christmas when it’s time', () => {
    const on = (y: number, m: number, d: number) => seasonalOn(new Date(y, m - 1, d))
    // Easter Sunday: 5 April 2026, 28 March 2027, 16 April 2028; Palm Sunday to Easter Monday.
    expect([on(2026, 3, 29), on(2026, 4, 5), on(2026, 4, 6), on(2026, 4, 7)]).toEqual([
      'easter',
      'easter',
      'easter',
      'spring',
    ])
    expect([on(2026, 3, 28), on(2027, 3, 28), on(2028, 4, 16), on(2028, 4, 18)]).toEqual([
      'spring',
      'easter',
      'easter',
      'spring',
    ])
    expect([on(2026, 10, 31), on(2026, 11, 1), on(2026, 11, 2)]).toEqual(['halloween', 'halloween', 'autumn'])
    expect([on(2026, 12, 1), on(2026, 12, 26), on(2026, 12, 27), on(2027, 1, 15), on(2027, 2, 28)]).toEqual([
      'christmas',
      'christmas',
      'winter',
      'winter',
      'winter',
    ])
    expect([on(2026, 3, 1), on(2026, 6, 1), on(2026, 8, 31), on(2026, 9, 1)]).toEqual([
      'spring',
      'summer',
      'summer',
      'autumn',
    ])
    expect(activeSeason('seasonal', new Date(2026, 6, 1))?.id).toBe('summer')
    // Whoever chose the old "Halloween and Christmas" gets Seasonal.
    expect(activeSeason('holidays', new Date(2026, 6, 1))?.id).toBe('summer')
    vi.stubGlobal('localStorage', { getItem: (k: string) => (k === 'wp-season' ? 'holidays' : null) })
    expect(loadSeasonChoice()).toBe('seasonal')
    vi.unstubAllGlobals()
  })

  it('runs on its own, as the guide pages run a copy of it', () => {
    // Built from its source alone, with nothing else in scope, as the guide pages do.
    const copy = new Function(`return (${seasonalOn.toString()})`)() as typeof seasonalOn
    expect(copy(new Date(2026, 3, 5))).toBe('easter')
  })
})
