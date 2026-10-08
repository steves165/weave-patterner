import { describe, expect, it } from 'vitest'
import { colorways, draftColors, recolor, shiftHue, toGrey } from './colorways'
import { defaultDraft } from './weave'

describe('colourways', () => {
  it('recolours every thread of a colour', () => {
    const d = recolor(defaultDraft(), { '#d6246e': '#00ff00' })
    expect(new Set(d.warpColors)).toEqual(new Set(['#00ff00']))
    expect(d.weftColors[0]).toBe('#ffd3e4')
    expect(draftColors(defaultDraft())).toEqual(['#d6246e', '#ffd3e4'])
  })

  it('turns hues, makes greys, and offers palettes matched by lightness', () => {
    expect(shiftHue('#ff0000', 120)).toBe('#00ff00')
    expect(shiftHue('#ff0000', 360)).toBe('#ff0000')
    expect(toGrey('#ffffff')).toBe('#ffffff')
    const ways = colorways(defaultDraft())
    expect(ways.map((w) => w.name)).toContain('Colours swapped')
    const swapped = ways.find((w) => w.name === 'Colours swapped')?.mapping
    expect(swapped).toEqual({ '#d6246e': '#ffd3e4', '#ffd3e4': '#d6246e' })
    const indigo = ways.find((w) => w.name === 'Indigo and natural')?.mapping
    expect(indigo).toEqual({ '#d6246e': '#1a237e', '#ffd3e4': '#f5f0e6' })
  })
})
