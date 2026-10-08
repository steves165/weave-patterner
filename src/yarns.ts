/** A yarn in the user's library: its colour links it to warp and weft threads of that colour. */
export interface Yarn {
  id: string
  name: string
  color: string
  /** Metres per kg (metric) or yards per lb (imperial), as entered. */
  grist?: number
  /** Price per kg or per lb. */
  price?: number
}

const KEY = 'weave-yarns'

export function loadYarns(): Yarn[] {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? '[]')
    return Array.isArray(raw)
      ? raw.filter(
          (y): y is Yarn =>
            y && typeof y.id === 'string' && typeof y.name === 'string' && /^#[0-9a-f]{6}$/i.test(y.color),
        )
      : []
  } catch {
    return []
  }
}

export function saveYarns(yarns: Yarn[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(yarns))
  } catch {
    // the library just won't be remembered
  }
}

/** The yarn for a thread colour, if the library has one in that colour (first match wins). */
export const yarnFor = (yarns: Yarn[], color: string) =>
  yarns.find((y) => y.color.toLowerCase() === color.toLowerCase())

export const newYarnId = () => `y${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
