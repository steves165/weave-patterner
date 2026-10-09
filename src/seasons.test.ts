import { describe, expect, it } from 'vitest'
import { activeSeason, holidayOn, mix, SEASONS, seasonBrand, seasonCss, seasonVars } from './seasons'

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
  it('include Halloween and Christmas, with unique ids', () => {
    const ids = SEASONS.map((s) => s.id)
    expect(ids).toEqual(expect.arrayContaining(['halloween', 'christmas']))
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

  it('mixes colours', () => {
    expect(mix('#ffffff', '#000000', 0.5)).toBe('#808080')
    expect(mix('#ff0000', '#0000ff', 1)).toBe('#ff0000')
  })

  it('"Halloween and Christmas" follows the calendar', () => {
    expect(holidayOn(new Date(2026, 9, 31))).toBe('halloween')
    expect(holidayOn(new Date(2026, 9, 10))).toBeNull()
    expect(holidayOn(new Date(2026, 11, 24))).toBe('christmas')
    expect(holidayOn(new Date(2026, 11, 30))).toBeNull()
    expect(activeSeason('holidays', new Date(2026, 5, 1))).toBeNull()
    expect(activeSeason('holidays', new Date(2026, 11, 1))?.id).toBe('christmas')
    expect(activeSeason('winter')?.name).toBe('Winter')
    expect(activeSeason('none')).toBeNull()
  })
})
