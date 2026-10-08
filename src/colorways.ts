import type { Draft } from './weave'

/** The draft's colours, warp first then weft, each once, in order of first use. */
export function draftColors(d: Draft): string[] {
  return [...new Set([...d.warpColors, ...d.weftColors].map((c) => c.toLowerCase()))]
}

/** Recolours a draft: each colour in `mapping` is replaced; others stay. */
export function recolor(d: Draft, mapping: Record<string, string>): Draft {
  const map = (c: string) => mapping[c.toLowerCase()]?.toLowerCase() ?? c
  return { ...d, warpColors: d.warpColors.map(map), weftColors: d.weftColors.map(map) }
}

const toHsl = (hex: string): [number, number, number] => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  if (max === min) return [0, 0, l]
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4
  return [h * 60, s, l]
}

const toHex = (h: number, s: number, l: number) => {
  const f = (n: number) => {
    const k = (n + h / 30) % 12
    const a = s * Math.min(l, 1 - l)
    const v = l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))
    return Math.round(v * 255)
      .toString(16)
      .padStart(2, '0')
  }
  return `#${f(0)}${f(8)}${f(4)}`
}

/** Turns a colour round the colour wheel by `degrees`, keeping its lightness and saturation. */
export const shiftHue = (hex: string, degrees: number) => {
  const [h, s, l] = toHsl(hex)
  return toHex((((h + degrees) % 360) + 360) % 360, s, l)
}

/** The same colour in grey, keeping its lightness. */
export const toGrey = (hex: string) => {
  const [, , l] = toHsl(hex)
  return toHex(0, 0, l)
}

export interface Colorway {
  name: string
  /** Old colour -> new colour. */
  mapping: Record<string, string>
}

const PALETTES: [string, string[]][] = [
  ['Indigo and natural', ['#1a237e', '#f5f0e6', '#5c6bc0', '#c5cae9']],
  ['Earth', ['#5d4037', '#d7ccc8', '#8d6e63', '#a1887f']],
  ['Forest', ['#1b5e20', '#f1f8e9', '#689f38', '#c5e1a5']],
  ['Berry', ['#880e4f', '#fce4ec', '#ad1457', '#f48fb1']],
  ['Charcoal and gold', ['#263238', '#ffca28', '#546e7a', '#ffe082']],
]

/**
 * Ready-made recolourings of the draft: the colours swapped round, turned round the colour wheel, in greys, and
 * in some palettes, darkest colour to darkest and lightest to lightest.
 */
export function colorways(d: Draft): Colorway[] {
  const colors = draftColors(d)
  const byLightness = [...colors].sort((a, b) => toHsl(a)[2] - toHsl(b)[2])
  const ways: Colorway[] = []
  if (colors.length >= 2) {
    // Each colour takes the next one's place.
    ways.push({
      name: 'Colours swapped',
      mapping: Object.fromEntries(colors.map((c, i) => [c, colors[(i + 1) % colors.length]])),
    })
  }
  for (const deg of [60, 120, 180, 240]) {
    ways.push({ name: `Hue turned ${deg}°`, mapping: Object.fromEntries(colors.map((c) => [c, shiftHue(c, deg)])) })
  }
  ways.push({ name: 'Greys', mapping: Object.fromEntries(colors.map((c) => [c, toGrey(c)])) })
  for (const [name, palette] of PALETTES) {
    // Palettes run dark to light; match colours by lightness.
    const ordered = [...palette].sort((a, b) => toHsl(a)[2] - toHsl(b)[2])
    ways.push({
      name,
      mapping: Object.fromEntries(
        byLightness.map((c, i) => [
          c,
          ordered[Math.round((i * (ordered.length - 1)) / Math.max(1, byLightness.length - 1))],
        ]),
      ),
    })
  }
  return ways
}
