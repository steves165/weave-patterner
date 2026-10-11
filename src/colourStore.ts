/**
 * Favourite colours and saved palettes, kept in this browser and shared by all three apps' colour pickers, beside a
 * set of basic colours that's always there.
 */
import { useSyncExternalStore } from 'react'

export interface Palette {
  name: string
  colours: string[]
  /** Hidden palettes stay saved but aren't shown in the picker. */
  hidden?: boolean
}

export interface ColourStore {
  favourites: string[]
  palettes: Palette[]
}

/** Basic colours, always in the picker: neutrals, then the colour wheel in deep and light shades, then naturals. */
export const BASIC_COLOURS = [
  '#000000',
  '#4d4d4d',
  '#9e9e9e',
  '#ffffff',
  '#c62828',
  '#ef6c00',
  '#f9a825',
  '#2e7d32',
  '#00838f',
  '#1565c0',
  '#283593',
  '#6a1b9a',
  '#ad1457',
  '#ef9a9a',
  '#ffcc80',
  '#fff59d',
  '#a5d6a7',
  '#80deea',
  '#90caf9',
  '#ce93d8',
  '#f48fb1',
  '#5d4037',
  '#a1887f',
  '#f5efe0',
]

const KEY = 'wp-colours'
export const MAX_FAVOURITES = 48
export const MAX_PALETTES = 30
const isHex = (v: unknown): v is string => typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v)

/** The store from untrusted data (storage), keeping what's valid. */
export function parseColourStore(x: unknown): ColourStore {
  const o = (x && typeof x === 'object' ? x : {}) as Record<string, unknown>
  const colours = (v: unknown) =>
    Array.isArray(v) ? [...new Set(v.filter(isHex).map((c) => c.toLowerCase()))].slice(0, MAX_FAVOURITES) : []
  return {
    favourites: colours(o.favourites),
    palettes: Array.isArray(o.palettes)
      ? o.palettes
          .filter((p) => p && typeof p === 'object' && typeof p.name === 'string' && p.name.trim())
          .slice(0, MAX_PALETTES)
          .map((p) => ({
            name: p.name.slice(0, 40),
            colours: colours(p.colours),
            ...(p.hidden ? { hidden: true } : {}),
          }))
      : [],
  }
}

let current: ColourStore | null = null
const listeners = new Set<() => void>()

function read(): ColourStore {
  if (current) return current
  try {
    current = parseColourStore(JSON.parse(localStorage.getItem(KEY) ?? '{}'))
  } catch {
    current = { favourites: [], palettes: [] }
  }
  return current
}

function write(next: ColourStore) {
  current = next
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    // kept for this visit only
  }
  for (const l of listeners) l()
}

// Another tab changed them.
if (typeof window !== 'undefined')
  window.addEventListener('storage', (e) => {
    if (e.key !== KEY) return
    current = null
    for (const l of listeners) l()
  })

/** The favourites and palettes, kept up to date as they change (here or in another tab). */
export function useColourStore(): ColourStore {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    read,
    read,
  )
}

const norm = (c: string) => c.toLowerCase()

export const colourActions = {
  addFavourite(c: string) {
    const s = read()
    if (!isHex(c) || s.favourites.includes(norm(c))) return
    write({ ...s, favourites: [...s.favourites, norm(c)].slice(-MAX_FAVOURITES) })
  },
  removeFavourite(c: string) {
    const s = read()
    write({ ...s, favourites: s.favourites.filter((x) => x !== norm(c)) })
  },
  /** Saves colours as a named palette (replacing one of that name). */
  savePalette(name: string, colours: string[]) {
    const s = read()
    const n = name.trim().slice(0, 40)
    if (!n || !colours.length) return
    const others = s.palettes.filter((p) => p.name.toLowerCase() !== n.toLowerCase())
    if (others.length >= MAX_PALETTES) throw new Error(`You can keep up to ${MAX_PALETTES} palettes`)
    write({ ...s, palettes: [...others, { name: n, colours: [...new Set(colours.map(norm))] }] })
  },
  removePalette(name: string) {
    const s = read()
    write({ ...s, palettes: s.palettes.filter((p) => p.name !== name) })
  },
  setPaletteHidden(name: string, hidden: boolean) {
    const s = read()
    write({
      ...s,
      palettes: s.palettes.map((p) => {
        if (p.name !== name) return p
        const { hidden: _, ...rest } = p
        return hidden ? { ...rest, hidden: true } : rest
      }),
    })
  },
  addToPalette(name: string, c: string) {
    const s = read()
    write({
      ...s,
      palettes: s.palettes.map((p) =>
        p.name === name && !p.colours.includes(norm(c)) ? { ...p, colours: [...p.colours, norm(c)] } : p,
      ),
    })
  },
  removeFromPalette(name: string, c: string) {
    const s = read()
    write({
      ...s,
      palettes: s.palettes.map((p) =>
        p.name === name ? { ...p, colours: p.colours.filter((x) => x !== norm(c)) } : p,
      ),
    })
  },
}

/** For tests: start again from storage. */
export const resetColourStoreCache = () => {
  current = null
}
